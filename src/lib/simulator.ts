/* ---------------------------------------------------------------------------
   Edge-node simulator
   Emulates the phone-mounted camera nodes: MediaPipe-style landmark features →
   deterministic feature-engineering scores → the JSON payload the dashboard
   receives. Nothing here sends anything but numbers; there is no video stream.

   Scoring (per the NeoScore v1 spec):
     S_face   = 1 if BFR < (μ − 1.8σ) OR ESI < 0.18
     S_cry    = 0 (<400 Hz) | 1 (400–600 Hz) | 2 (≥600 Hz)
     S_arms   = 1 if rolling mean of jerk > τ_jerk
     S_legs   = 1 if rolling mean of jerk > τ_jerk
     S_arousal= 1 if centroid-motion variance over 30s > threshold
     NIPS     = S_face + S_cry + S_arms + S_legs + S_arousal   (declared 0–7)
   All thresholds live in the per-patient Calibration, never hardcoded.
--------------------------------------------------------------------------- */

import type {
  Calibration,
  ClinicalEvent,
  EventType,
  PatientProfile,
  Scenario,
  TelemetryMetrics,
  TelemetryPayload,
  TelemetryStatus,
  TrendPoint,
} from "./types";
import { clamp, gaussian, lerp, mulberry32 } from "./utils";

export const TREND_STEP_MS = 30_000; // 30s downsampled trend bucket
export const WINDOW_MS = 60_000; // 60s sparkline / raw window
export const TREND_WINDOW_MS = 8 * 60 * 60 * 1000; // 8 hours

interface BedSeed extends PatientProfile {
  seed: number;
  /** Optional phase offset (seconds) for the episodic distress wave. */
  phase?: number;
  baselineMean: number;
  baselineSigma: number;
  tauJerk: number;
  /** Baselines for confidence (fraction of the time the node is confident). */
  nodeQuality: number;
}

const ROSTER: BedSeed[] = [
  { device_id: "iQOO-NICU-BED-01", patient_pseudonym_id: "NEO-88201", bedLabel: "Bed 01", gestationalAgeWeeks: 31, correctedAgeWeeks: 33, birthWeightGrams: 1480, dayOfLife: 9, scenario: "stable", seed: 1011, baselineMean: 0.24, baselineSigma: 0.018, tauJerk: 3.1, nodeQuality: 0.97 },
  { device_id: "iQOO-NICU-BED-02", patient_pseudonym_id: "NEO-88204", bedLabel: "Bed 02", gestationalAgeWeeks: 29, correctedAgeWeeks: 30, birthWeightGrams: 1120, dayOfLife: 5, scenario: "fussy", seed: 1022, baselineMean: 0.27, baselineSigma: 0.024, tauJerk: 2.6, nodeQuality: 0.9 },
  { device_id: "iQOO-NICU-BED-03", patient_pseudonym_id: "NEO-88207", bedLabel: "Bed 03", gestationalAgeWeeks: 34, correctedAgeWeeks: 35, birthWeightGrams: 2110, dayOfLife: 3, scenario: "recovering", seed: 1033, baselineMean: 0.22, baselineSigma: 0.02, tauJerk: 3.4, nodeQuality: 0.96 },
  { device_id: "iQOO-NICU-BED-04", patient_pseudonym_id: "NEO-88219", bedLabel: "Bed 04", gestationalAgeWeeks: 26, correctedAgeWeeks: 27, birthWeightGrams: 780, dayOfLife: 12, scenario: "deteriorating", seed: 1044, baselineMean: 0.3, baselineSigma: 0.03, tauJerk: 2.3, nodeQuality: 0.93 },
  { device_id: "iQOO-NICU-BED-05", patient_pseudonym_id: "NEO-88223", bedLabel: "Bed 05", gestationalAgeWeeks: 32, correctedAgeWeeks: 33, birthWeightGrams: 1690, dayOfLife: 7, scenario: "stable", seed: 1055, baselineMean: 0.23, baselineSigma: 0.017, tauJerk: 3.3, nodeQuality: 0.98 },
  { device_id: "iQOO-NICU-BED-06", patient_pseudonym_id: "NEO-88231", bedLabel: "Bed 06", gestationalAgeWeeks: 28, correctedAgeWeeks: 29, birthWeightGrams: 980, dayOfLife: 15, scenario: "episodic", seed: 1066, phase: 399, baselineMean: 0.28, baselineSigma: 0.026, tauJerk: 2.5, nodeQuality: 0.88 },
  { device_id: "iQOO-NICU-BED-07", patient_pseudonym_id: "NEO-88236", bedLabel: "Bed 07", gestationalAgeWeeks: 33, correctedAgeWeeks: 34, birthWeightGrams: 1980, dayOfLife: 4, scenario: "stable", seed: 1077, baselineMean: 0.21, baselineSigma: 0.016, tauJerk: 3.5, nodeQuality: 0.97 },
  { device_id: "iQOO-NICU-BED-08", patient_pseudonym_id: "NEO-88244", bedLabel: "Bed 08", gestationalAgeWeeks: 30, correctedAgeWeeks: 31, birthWeightGrams: 1340, dayOfLife: 8, scenario: "fussy", seed: 1088, baselineMean: 0.26, baselineSigma: 0.023, tauJerk: 2.7, nodeQuality: 0.91 },
  { device_id: "iQOO-NICU-BED-09", patient_pseudonym_id: "NEO-88251", bedLabel: "Bed 09", gestationalAgeWeeks: 35, correctedAgeWeeks: 35, birthWeightGrams: 2240, dayOfLife: 2, scenario: "recovering", seed: 1099, baselineMean: 0.2, baselineSigma: 0.019, tauJerk: 3.6, nodeQuality: 0.95 },
  { device_id: "iQOO-NICU-BED-10", patient_pseudonym_id: "NEO-88258", bedLabel: "Bed 10", gestationalAgeWeeks: 27, correctedAgeWeeks: 29, birthWeightGrams: 890, dayOfLife: 21, scenario: "stable", seed: 1110, baselineMean: 0.25, baselineSigma: 0.021, tauJerk: 3.0, nodeQuality: 0.94 },
  { device_id: "iQOO-NICU-BED-11", patient_pseudonym_id: "NEO-88263", bedLabel: "Bed 11", gestationalAgeWeeks: 31, correctedAgeWeeks: 32, birthWeightGrams: 1520, dayOfLife: 6, scenario: "episodic", seed: 1121, phase: 2806, baselineMean: 0.27, baselineSigma: 0.025, tauJerk: 2.8, nodeQuality: 0.89 },
  { device_id: "iQOO-NICU-BED-12", patient_pseudonym_id: "NEO-88270", bedLabel: "Bed 12", gestationalAgeWeeks: 34, correctedAgeWeeks: 34, birthWeightGrams: 2050, dayOfLife: 1, scenario: "stable", seed: 1132, baselineMean: 0.22, baselineSigma: 0.018, tauJerk: 3.2, nodeQuality: 0.96 },
];

const EVENT_LABELS: Record<EventType, string> = {
  heel_prick: "Heel-prick / blood draw",
  suctioning: "Airway suctioning",
  positioning: "Repositioning",
  feeding: "Enteral feeding",
  medication: "Analgesia given",
  cuddle: "Kangaroo care",
};

const EVENT_POOL: EventType[] = [
  "heel_prick",
  "suctioning",
  "positioning",
  "feeding",
  "medication",
  "cuddle",
];

/** A self-contained simulated edge node with its own latent distress process. */
export class EdgeNodeSim {
  readonly profile: PatientProfile;
  readonly calibration: Calibration;
  readonly nodeQuality: number;

  private rand: () => number;
  private distress: number;
  private jerkHist: number[] = [];
  private arousalHist: number[] = [];
  private elapsed = 0; // seconds advanced
  private phase: number;

  constructor(seed: BedSeed, startDistress: number) {
    this.profile = {
      device_id: seed.device_id,
      patient_pseudonym_id: seed.patient_pseudonym_id,
      bedLabel: seed.bedLabel,
      gestationalAgeWeeks: seed.gestationalAgeWeeks,
      correctedAgeWeeks: seed.correctedAgeWeeks,
      birthWeightGrams: seed.birthWeightGrams,
      dayOfLife: seed.dayOfLife,
      scenario: seed.scenario,
    };
    this.calibration = {
      baselineMean: seed.baselineMean,
      baselineSigma: seed.baselineSigma,
      tauJerk: seed.tauJerk,
      cryWhimperHz: 400,
      cryVigorousHz: 600,
    };
    this.nodeQuality = seed.nodeQuality;
    this.rand = mulberry32(seed.seed);
    this.distress = startDistress;
    // De-synchronise the episodic wave per bed so spikes don't coincide.
    this.phase = seed.phase ?? seed.seed % 2640;
  }

  /** Scenario target distress as a function of elapsed seconds. */
  private target(): number {
    const hours = this.elapsed / 3600;
    switch (this.profile.scenario) {
      case "stable":
        return 0.05;
      case "fussy":
        return 0.45;
      case "episodic": {
        const wave = (Math.sin((this.elapsed + this.phase) / 420) + 1) / 2; // ~44 min cycle
        return lerp(0.12, 0.86, wave * wave);
      }
      case "deteriorating":
        return lerp(0.2, 0.96, clamp(hours / 8, 0, 1));
      case "recovering":
        return lerp(0.9, 0.15, clamp(hours / 8, 0, 1));
      default:
        return 0.1;
    }
  }

  /** External perturbation, e.g. an analgesia dose or a heel-prick. */
  nudge(delta: number) {
    this.distress = clamp(this.distress + delta, 0, 1.15);
  }

  private step(dt: number) {
    const theta = 0.05;
    const sigma = 0.02;
    const pull = theta * (this.target() - this.distress);
    this.distress += pull * dt + sigma * Math.sqrt(dt) * gaussian(this.rand);
    // Occasional startle burst (transient, re-reverts within a few seconds).
    if (this.rand() < dt * 0.0012) {
      this.distress += 0.07 + this.rand() * 0.11;
    }
    this.distress = clamp(this.distress, 0, 1.15);
    this.elapsed += dt;
  }

  /** Produce the next payload after advancing `dt` seconds. */
  advance(dt: number, timestampMs: number): TelemetryPayload {
    this.step(dt);
    const d = this.distress;
    const cal = this.calibration;
    const noise = () => gaussian(this.rand);

    // MediaPipe-style facial features.
    const browFurrow = Math.max(
      0.05,
      cal.baselineMean + noise() * cal.baselineSigma * 0.25 - d * cal.baselineSigma * 2.6,
    );
    const eyeSqueeze = clamp(0.4 - d * 0.31 + noise() * 0.012, 0.04, 0.6);

    const faceThreshold = cal.baselineMean - 1.8 * cal.baselineSigma;
    const facialScore = browFurrow < faceThreshold || eyeSqueeze < 0.18 ? 1 : 0;

    // Acoustic F0 from MFCC on the mic input.
    const f0 = Math.max(
      90,
      175 + d * 700 + noise() * 12 + Math.sin(this.elapsed / 7) * 8,
    );
    const cryScore = f0 >= cal.cryVigorousHz ? 2 : f0 >= cal.cryWhimperHz ? 1 : 0;

    // Limb jerk = 3rd derivative of landmark position (approximated).
    const wristJerk = Math.max(0.1, 0.65 + d * 5.9 + noise() * 0.18);
    const ankleJerk = Math.max(0.1, 0.6 + d * 5.7 + noise() * 0.18);
    this.jerkHist.push(wristJerk, ankleJerk);
    if (this.jerkHist.length > 60) this.jerkHist.splice(0, this.jerkHist.length - 60);
    const meanJerk =
      this.jerkHist.reduce((a, b) => a + b, 0) / Math.max(1, this.jerkHist.length);

    const upperLimbScore = meanJerk > cal.tauJerk ? 1 : 0;
    // Legs follow arms with a small offset so the two can diverge.
    const lowerLimbScore = meanJerk * 0.94 > cal.tauJerk ? 1 : 0;

    // Centroid-motion variance over a sliding ~30s window.
    const centro = (wristJerk + ankleJerk) / 2;
    this.arousalHist.push(centro);
    if (this.arousalHist.length > 30)
      this.arousalHist.splice(0, this.arousalHist.length - 30);
    const meanC =
      this.arousalHist.reduce((a, b) => a + b, 0) / Math.max(1, this.arousalHist.length);
    const variance =
      this.arousalHist.reduce((a, b) => a + (b - meanC) ** 2, 0) /
      Math.max(1, this.arousalHist.length);
    const arousalScore = variance > 1.1 || meanC > cal.tauJerk * 1.45 ? 1 : 0;

    const composite = clamp(
      facialScore + cryScore + upperLimbScore + lowerLimbScore + arousalScore,
      0,
      7,
    );

    // Node confidence degrades with heavy motion and intermittently.
    const baseConfidence = this.nodeQuality - clamp(meanJerk / 30, 0, 0.18);
    const confidence = clamp(baseConfidence + noise() * 0.015, 0.42, 0.995);

    const status = statusFromScore(composite);

    const metrics: TelemetryMetrics = {
      facial_score: facialScore,
      brow_furrow_ratio: round(browFurrow, 3),
      eye_squeeze_index: round(eyeSqueeze, 3),
      cry_score: cryScore,
      cry_fundamental_freq_hz: round(f0, 1),
      upper_limb_score: upperLimbScore,
      lower_limb_score: lowerLimbScore,
      wrist_jerk_metric: round(wristJerk, 2),
      ankle_jerk_metric: round(ankleJerk, 2),
      arousal_state_score: arousalScore,
    };

    return {
      device_id: this.profile.device_id,
      patient_pseudonym_id: this.profile.patient_pseudonym_id,
      timestamp: new Date(timestampMs).toISOString(),
      nips_composite_score: composite,
      status,
      metrics,
      confidence: round(confidence, 3),
      alert_trigger: composite >= 5,
    };
  }
}

export function statusFromScore(score: number): TelemetryStatus {
  if (score >= 5) return "CRITICAL_DISTRESS";
  if (score >= 3) return "MODERATE_DISTRESS";
  if (score === 2) return "MILD_DISCOMFORT";
  return "CALM";
}

function round(value: number, digits: number) {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

/** ------------------------------------------------------------------------
 *  History seeding — gives every bed a plausible 8-hour past so the trend
 *  graph, event markers, and dotted "gap" segments are populated on load.
 *  --------------------------------------------------------------------- */
export interface SeedResult {
  node: EdgeNodeSim;
  trend: TrendPoint[];
  window: TelemetryPayload[];
  latest: TelemetryPayload | null;
  events: ClinicalEvent[];
}

export function seedWard(now: number): SeedResult[] {
  return ROSTER.map((seed) => seedBed(seed, now));
}

function seedBed(seed: BedSeed, now: number): SeedResult {
  const startDistress =
    seed.scenario === "recovering" ? 0.9 : seed.scenario === "deteriorating" ? 0.18 : 0.15;
  const node = new EdgeNodeSim(seed, startDistress);
  const rand = mulberry32(seed.seed ^ 0x9e3779b9);

  const trend: TrendPoint[] = [];
  const steps = Math.floor(TREND_WINDOW_MS / TREND_STEP_MS); // 960 buckets
  const startT = now - TREND_WINDOW_MS;
  // Advance the latent process at 5s resolution so history dynamics match live.
  const SUBSTEPS = 6;
  const SUB_DT = TREND_STEP_MS / 1000 / SUBSTEPS;

  // Edge outages baked into the past; no backfill → visible dotted segment.
  const gaps: Array<{ from: number; to: number }> = [];
  const gapCount = seed.scenario === "stable" ? 1 : 2;
  for (let g = 0; g < gapCount; g++) {
    const from = startT + rand() * (TREND_WINDOW_MS - 900_000) + 300_000;
    const len = (6 + rand() * 22) * 60_000; // 6–28 min outage
    gaps.push({ from, to: from + len });
  }
  gaps.sort((a, b) => a.from - b.from);

  for (let i = 0; i < steps; i++) {
    const t = startT + i * TREND_STEP_MS;
    const inGap = gaps.some((g) => t >= g.from && t <= g.to);
    // Always advance the latent process so reconnection picks up naturally.
    let payload = node.advance(SUB_DT, t);
    for (let k = 1; k < SUBSTEPS; k++) {
      payload = node.advance(SUB_DT, t + k * SUB_DT * 1000);
    }
    trend.push({
      t,
      score: payload.nips_composite_score,
      confidence: payload.confidence,
      gap: inGap,
    });
  }

  // One-minute window of 1 Hz samples for the sparkline and raw pane.
  const window: TelemetryPayload[] = [];
  const windowSteps = Math.floor(WINDOW_MS / 1000); // 60
  for (let i = windowSteps; i >= 0; i--) {
    const t = now - i * 1000;
    window.push(node.advance(1, t));
  }
  const latest = window[window.length - 1] ?? null;

  // Clinical interventions, biased toward the spikes in the trend.
  const events: ClinicalEvent[] = [];
  const eventCount = 2 + Math.floor(rand() * 5);
  const nurses = ["RN-4012", "RN-1187", "RN-2094", "RN-3350", "RN-7721"];
  for (let e = 0; e < eventCount; e++) {
    const t = now - rand() * TREND_WINDOW_MS * 0.94;
    const type = EVENT_POOL[Math.floor(rand() * EVENT_POOL.length)];
    events.push({
      id: `${seed.device_id}_evt_${e}`,
      device_id: seed.device_id,
      timestamp: t,
      type,
      label: EVENT_LABELS[type],
      nurse_id: nurses[Math.floor(rand() * nurses.length)],
    });
  }
  events.sort((a, b) => a.timestamp - b.timestamp);

  return { node, trend, window, latest, events };
}

export function eventLabel(type: EventType) {
  return EVENT_LABELS[type];
}

export function randomEventType(rand: () => number): EventType {
  return EVENT_POOL[Math.floor(rand() * EVENT_POOL.length)];
}

export const SCENARIO_LABEL: Record<Scenario, string> = {
  stable: "Stable",
  episodic: "Episodic",
  deteriorating: "Deteriorating",
  recovering: "Recovering",
  fussy: "Fussy",
};

