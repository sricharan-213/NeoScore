/* ---------------------------------------------------------------------------
   Normalized telemetry store
   Single store keyed by device_id. Each incoming message is merged in; older
   values are retained for the trend graph (rolling 8h window, then discarded).
   Reads go through useSyncExternalStore so only the bed that changed re-renders.
--------------------------------------------------------------------------- */

import { useSyncExternalStore } from "react";
import type {
  AlarmRecord,
  BedState,
  ClinicalEvent,
  LinkState,
  NurseSession,
  TelemetryPayload,
  TrendPoint,
} from "./types";
import { EdgeNodeSim, TREND_STEP_MS, TREND_WINDOW_MS, eventLabel, randomEventType, seedWard } from "./simulator";
import { riskFromScore } from "./risk";
import { clamp, mulberry32, uid } from "./utils";
import { appendAuditEntry } from "./audit";

const STALE_AFTER_MS = 5_000; // no update in >5s → visually distinct stale state
const SUSTAIN_SECONDS = 3; // severe must be sustained to alarm
const MAX_WINDOW = 150; // keep ~2.5 min of 1 Hz samples

export interface WardSnapshot {
  total: number;
  live: number;
  stale: number;
  offline: number;
  severe: number;
  moderate: number;
  normal: number;
  unacknowledgedAlarms: number;
  lastTelemetryAt: number;
  meanConfidence: number;
  socketConnected: boolean;
  socketLatencyMs: number;
  receivedPerSecond: number;
}

class TelemetryStore {
  private beds = new Map<string, BedState>();
  private nodes = new Map<string, EdgeNodeSim>();
  private events: ClinicalEvent[] = [];
  private alarms: AlarmRecord[] = [];
  private listeners = new Set<() => void>();

  private version = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private started = false;
  private initialized = false;

  private severeStreak = new Map<string, number>();
  private disarmed = new Set<string>();
  private offlineUntil = new Map<string, number>();
  private offlineSince = new Map<string, number>();
  private nextEventAt = new Map<string, number>();
  private lastScore = new Map<string, number>();
  private rand = mulberry32(Date.now() % 100000);

  private socketConnected = true;
  private socketLatencyMs = 24;
  private receivedPerSecond = 0;

  // version-keyed derived caches (keep snapshot identity stable per version)
  private cacheVersion = -1;
  private bedsArray: BedState[] = [];
  private eventsArray: ClinicalEvent[] = [];
  private wardCache: WardSnapshot | null = null;

  /* ------------------------------- lifecycle --------------------------- */

  init() {
    if (this.initialized) return;
    const now = Date.now();
    for (const seed of seedWard(now)) {
      this.nodes.set(seed.node.profile.device_id, seed.node);
      this.beds.set(seed.node.profile.device_id, {
        device_id: seed.node.profile.device_id,
        patient: seed.node.profile,
        latest: seed.latest,
        window: seed.window,
        trend: seed.trend,
        lastReceivedAt: now,
        link: "LIVE",
        calibration: seed.node.calibration,
      });
      this.events.push(...seed.events);
      this.lastScore.set(seed.node.profile.device_id, seed.latest?.nips_composite_score ?? 0);
      this.nextEventAt.set(seed.node.profile.device_id, now + (60 + this.rand() * 300) * 1000);
    }
    this.events.sort((a, b) => a.timestamp - b.timestamp);
    this.initialized = true;
    this.bump();
  }

  start() {
    this.init();
    if (this.started) return;
    this.started = true;
    this.timer = setInterval(() => this.tick(), 1000);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.started = false;
  }

  /* -------------------------------- tick ------------------------------- */

  private tick() {
    const now = Date.now();
    let received = 0;

    for (const [deviceId, node] of this.nodes) {
      const offlineUntil = this.offlineUntil.get(deviceId);
      const isOffline = offlineUntil !== undefined && now < offlineUntil;

      if (isOffline) {
        this.offlineSince.set(deviceId, this.offlineSince.get(deviceId) ?? now);
        this.setLink(deviceId, "OFFLINE");
        continue;
      }

      if (offlineUntil !== undefined) this.offlineUntil.delete(deviceId);

      if (this.offlineSince.has(deviceId)) {
        const since = this.offlineSince.get(deviceId)!;
        const missing = Math.floor((now - since) / TREND_STEP_MS);
        this.offlineSince.delete(deviceId);
        if (missing > 0) {
          // Backfill from the edge node's encrypted local buffer on reconnect.
          this.backfill(deviceId, node, since, now);
        }
        this.setLinkNote(
          deviceId,
          `Reconnected · backfilled ${Math.round((now - since) / 1000)}s from edge buffer`,
        );
        this.events.push({
          id: uid("evt"),
          device_id: deviceId,
          timestamp: now,
          type: "positioning",
          label: "Edge node reconnected · buffer backfilled",
          nurse_id: "system",
        });
      }

      const payload = node.advance(1, now);
      this.ingest(payload, now);
      received++;

      // Randomly drop a node to demonstrate stale/offline handling. Rare.
      if (this.rand() < 0.0008) {
        const downFor = (12 + this.rand() * 26) * 1000;
        this.offlineUntil.set(deviceId, now + downFor);
        this.setLink(deviceId, "STALE");
      }

      // Occasional live clinical intervention.
      const nextEvt = this.nextEventAt.get(deviceId) ?? now;
      if (now >= nextEvt) {
        this.addLiveEvent(node, now);
        this.nextEventAt.set(deviceId, now + (90 + this.rand() * 420) * 1000);
      }
    }

    // Socket-level connectivity + latency jitter for the sync indicator.
    this.socketConnected = this.offlineUntil.size < 3;
    this.socketLatencyMs = Math.round(clamp(this.socketLatencyMs + (this.rand() - 0.5) * 8, 8, 120));
    this.receivedPerSecond = received;

    this.pruneTrend(now);
    this.bump();
  }

  private ingest(payload: TelemetryPayload, now: number) {
    const deviceId = payload.device_id;
    const bed = this.beds.get(deviceId);
    if (!bed) return;

    const window = bed.window.length >= MAX_WINDOW ? bed.window.slice(1) : bed.window.slice();
    window.push(payload);

    const trend = bed.trend.slice();
    const lastTrend = trend[trend.length - 1];
    if (!lastTrend || now - lastTrend.t >= TREND_STEP_MS) {
      trend.push({
        t: now,
        score: payload.nips_composite_score,
        confidence: payload.confidence,
        gap: false,
      });
    }

    this.beds.set(deviceId, {
      ...bed,
      latest: payload,
      window,
      trend,
      lastReceivedAt: now,
      link: "LIVE",
      linkNote: undefined,
    });

    this.lastScore.set(deviceId, payload.nips_composite_score);
    this.evaluateAlarm(payload, now);
  }

  private backfill(deviceId: string, node: EdgeNodeSim, from: number, to: number) {
    const bed = this.beds.get(deviceId);
    if (!bed) return;
    const trend = bed.trend.slice();
    let t = from + TREND_STEP_MS;
    while (t < to) {
      const p = node.advance(TREND_STEP_MS / 1000, t);
      trend.push({ t, score: p.nips_composite_score, confidence: p.confidence, gap: false });
      t += TREND_STEP_MS;
    }
    this.beds.set(deviceId, { ...bed, trend });
  }

  private pruneTrend(now: number) {
    const cutoff = now - TREND_WINDOW_MS;
    for (const [deviceId, bed] of this.beds) {
      if (bed.trend.length && bed.trend[0].t < cutoff) {
        this.beds.set(deviceId, {
          ...bed,
          trend: bed.trend.filter((p) => p.t >= cutoff),
        });
      }
    }
  }

  private evaluateAlarm(payload: TelemetryPayload, now: number) {
    const deviceId = payload.device_id;
    if (payload.nips_composite_score >= 5) {
      this.severeStreak.set(deviceId, (this.severeStreak.get(deviceId) ?? 0) + 1);
    } else {
      // Re-arm once the bed settles back below the severe band.
      this.severeStreak.set(deviceId, 0);
      this.disarmed.delete(deviceId);
    }
    const streak = this.severeStreak.get(deviceId) ?? 0;

    if (streak < SUSTAIN_SECONDS) return;

    const bed = this.beds.get(deviceId);
    if (!bed) return;
    if (this.disarmed.has(deviceId)) return;
    const existing = this.alarms.find((a) => a.device_id === deviceId && a.acknowledged_at === null);
    if (existing) {
      existing.peak_score = Math.max(existing.peak_score, payload.nips_composite_score);
      this.disarmed.add(deviceId);
      return;
    }
    this.disarmed.add(deviceId);
    this.alarms = [
      {
        id: uid("alarm"),
        device_id: deviceId,
        patient_pseudonym_id: payload.patient_pseudonym_id,
        bedLabel: bed.patient.bedLabel,
        triggered_at: now,
        peak_score: payload.nips_composite_score,
        score_at_trigger: payload.nips_composite_score,
        acknowledged_at: null,
        acknowledged_by: null,
        acknowledged_by_name: null,
        note: null,
      },
      ...this.alarms,
    ].slice(0, 200);
  }

  private addLiveEvent(node: EdgeNodeSim, now: number) {
    const type = randomEventType(this.rand);
    this.events.push({
      id: uid("evt"),
      device_id: node.profile.device_id,
      timestamp: now,
      type,
      label: eventLabel(type),
      nurse_id: `RN-${1000 + Math.floor(this.rand() * 8000)}`,
    });
    // Comfort measures visibly settle the infant's latent distress.
    if (type === "cuddle") node.nudge(-0.32);
    if (type === "medication") node.nudge(-0.45);
    if (type === "positioning") node.nudge(-0.14);
    if (type === "heel_prick" || type === "suctioning") node.nudge(0.28);
  }

  private setLink(deviceId: string, link: LinkState) {
    const bed = this.beds.get(deviceId);
    if (!bed) return;
    if (bed.link === link) return;
    this.beds.set(deviceId, {
      ...bed,
      link,
      linkNote: link === "OFFLINE" ? "Edge node offline · no telemetry" : bed.linkNote,
    });
  }

  private setLinkNote(deviceId: string, note: string) {
    const bed = this.beds.get(deviceId);
    if (!bed) return;
    this.beds.set(deviceId, { ...bed, linkNote: note });
  }

  /* -------------------------------- writes ----------------------------- */

  acknowledge(alarmId: string, session: NurseSession, note: string) {
    const now = Date.now();
    this.alarms = this.alarms.map((a) =>
      a.id === alarmId
        ? {
            ...a,
            acknowledged_at: now,
            acknowledged_by: session.nurseId,
            acknowledged_by_name: session.name,
            note,
          }
        : a,
    );
    appendAuditEntry({
      id: uid("ack"),
      alarm_id: alarmId,
      device_id: this.alarms.find((a) => a.id === alarmId)?.device_id ?? "",
      patient_pseudonym_id: this.alarms.find((a) => a.id === alarmId)?.patient_pseudonym_id ?? "",
      nurse_id: session.nurseId,
      nurse_name: session.name,
      note,
      acknowledged_at: now,
    });
    this.bump();
  }

  /* -------------------------------- reads ------------------------------ */

  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };

  private bump() {
    this.version++;
    this.cacheVersion = -1;
    this.wardCache = null;
    for (const l of this.listeners) l();
  }

  private refreshCaches() {
    if (this.cacheVersion === this.version) return;
    this.cacheVersion = this.version;

    const now = Date.now();
    this.bedsArray = [...this.beds.values()].map((bed) => ({
      ...bed,
      link: this.computeLink(bed, now),
    }));

    // Auto-sort: severe first, then moderate, then normal; higher score first.
    const rank: Record<string, number> = { SEVERE: 0, MODERATE: 1, NORMAL: 2 };
    this.bedsArray.sort((a, b) => {
      const ra = rank[riskFromScore(a.latest?.nips_composite_score ?? 0)];
      const rb = rank[riskFromScore(b.latest?.nips_composite_score ?? 0)];
      if (ra !== rb) return ra - rb;
      const sa = a.latest?.nips_composite_score ?? -1;
      const sb = b.latest?.nips_composite_score ?? -1;
      if (sa !== sb) return sb - sa;
      return a.patient.bedLabel.localeCompare(b.patient.bedLabel);
    });

    this.eventsArray = this.events.slice();
  }

  private computeLink(bed: BedState, now: number): LinkState {
    if (!bed.latest) return "OFFLINE";
    if (bed.link === "OFFLINE") return "OFFLINE";
    if (now - bed.lastReceivedAt > STALE_AFTER_MS) return "STALE";
    return "LIVE";
  }

  getVersion = () => this.version;

  getBed = (deviceId: string): BedState | undefined => {
    this.refreshCaches();
    return this.bedsArray.find((b) => b.device_id === deviceId);
  };

  getBeds = (): BedState[] => {
    this.refreshCaches();
    return this.bedsArray;
  };

  getEvents = (): ClinicalEvent[] => {
    this.refreshCaches();
    return this.eventsArray;
  };

  getAlarms = (): AlarmRecord[] => this.alarms;

  getUnacknowledgedAlarms = (): AlarmRecord[] => this.alarms.filter((a) => a.acknowledged_at === null);

  getWard = (): WardSnapshot => {
    this.refreshCaches();
    if (this.wardCache) return this.wardCache;
    const beds = this.bedsArray;
    let live = 0;
    let stale = 0;
    let offline = 0;
    let severe = 0;
    let moderate = 0;
    let normal = 0;
    let lastTelemetryAt = 0;
    let confSum = 0;
    let confCount = 0;
    for (const bed of beds) {
      if (bed.link === "LIVE") live++;
      else if (bed.link === "STALE") stale++;
      else offline++;
      const risk = riskFromScore(bed.latest?.nips_composite_score ?? 0);
      if (risk === "SEVERE") severe++;
      else if (risk === "MODERATE") moderate++;
      else normal++;
      lastTelemetryAt = Math.max(lastTelemetryAt, bed.lastReceivedAt);
      if (bed.latest) {
        confSum += bed.latest.confidence;
        confCount++;
      }
    }
    this.wardCache = {
      total: beds.length,
      live,
      stale,
      offline,
      severe,
      moderate,
      normal,
      unacknowledgedAlarms: this.alarms.filter((a) => a.acknowledged_at === null).length,
      lastTelemetryAt,
      meanConfidence: confCount ? confSum / confCount : 0,
      socketConnected: this.socketConnected,
      socketLatencyMs: this.socketLatencyMs,
      receivedPerSecond: this.receivedPerSecond,
    };
    return this.wardCache;
  };

  /** Trend points for a bed with gap segments preserved. */
  getTrend = (deviceId: string): TrendPoint[] => this.beds.get(deviceId)?.trend ?? [];
}

export const telemetryStore = new TelemetryStore();

/* --------------------------------- hooks -------------------------------- */

export function useBed(deviceId: string): BedState | undefined {
  return useSyncExternalStore(
    telemetryStore.subscribe,
    () => telemetryStore.getBed(deviceId),
    () => telemetryStore.getBed(deviceId),
  );
}

export function useBeds(): BedState[] {
  return useSyncExternalStore(
    telemetryStore.subscribe,
    () => telemetryStore.getBeds(),
    () => telemetryStore.getBeds(),
  );
}

export function useWard(): WardSnapshot {
  return useSyncExternalStore(
    telemetryStore.subscribe,
    () => telemetryStore.getWard(),
    () => telemetryStore.getWard(),
  );
}

export function useAlarms(): AlarmRecord[] {
  return useSyncExternalStore(
    telemetryStore.subscribe,
    () => telemetryStore.getAlarms(),
    () => telemetryStore.getAlarms(),
  );
}

export function useEvents(): ClinicalEvent[] {
  return useSyncExternalStore(
    telemetryStore.subscribe,
    () => telemetryStore.getEvents(),
    () => telemetryStore.getEvents(),
  );
}

export function useStoreVersion(): number {
  return useSyncExternalStore(
    telemetryStore.subscribe,
    () => telemetryStore.getVersion(),
    () => telemetryStore.getVersion(),
  );
}
