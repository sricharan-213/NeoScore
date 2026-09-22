import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Gauge, Radio } from "lucide-react";
import { useAlarms, useBeds, useEvents, useWard } from "@/lib/store";
import { useSession } from "@/lib/session";
import { useNow } from "@/lib/useNow";
import { RISK_BANDS } from "@/lib/risk";
import { RiskPill } from "@/components/RiskSignal";
import { TopBar } from "@/components/TopBar";
import { BedCard } from "@/components/BedCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { BedDetailDrawer } from "@/components/BedDetailDrawer";
import { AlarmModal } from "@/components/AlarmModal";
import { AlarmToast } from "@/components/AlarmToast";
import { formatSince } from "@/lib/utils";

export function Ward() {
  const beds = useBeds();
  const ward = useWard();
  const events = useEvents();
  const alarms = useAlarms();
  const session = useSession();
  const now = useNow(1000);

  const [selected, setSelected] = useState<string | null>(null);
  const [surface, setSurface] = useState<"modal" | "toast">("toast");
  const prevCount = useRef(0);

  const unack = useMemo(
    () => alarms.filter((a) => a.acknowledged_at === null),
    [alarms],
  );

  useEffect(() => {
    if (unack.length > prevCount.current) setSurface("modal");
    prevCount.current = unack.length;
  }, [unack.length]);

  const selectedBed = beds.find((b) => b.device_id === selected) ?? null;
  const selectedAlarm =
    unack.find((a) => a.device_id === selected) ??
    alarms.find((a) => a.device_id === selected) ??
    null;

  const resolveScore = (deviceId: string) =>
    beds.find((b) => b.device_id === deviceId)?.latest?.nips_composite_score ?? 0;

  return (
    <div className="min-h-screen bg-canvas">
      <TopBar
        ward={ward}
        wardName={session?.ward ?? "NICU · Ward A"}
        onOpenAlarms={() => setSurface("modal")}
      />

      <main className="mx-auto max-w-[1800px] px-3 py-4 sm:px-5 sm:py-6">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Ward command center</h1>
            <p className="mt-0.5 text-[12px] text-muted">
              {ward.total} monitored beds · sorted by severity · telemetry 1 Hz per bed over local
              WebSocket
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Freshness / latency strip */}
            <div className="flex items-center gap-3 rounded-lg border border-line bg-panel/70 px-3 py-2 text-[11px]">
              <span className="flex items-center gap-1.5 text-muted">
                <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="tnum">{ward.live} live</span>
              </span>
              <span className="tnum text-muted">{ward.stale} stale</span>
              <span className="tnum text-muted">{ward.offline} offline</span>
              <span className="h-3 w-px bg-line" />
              <span className="flex items-center gap-1.5 text-muted">
                <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="tnum">{(ward.meanConfidence * 100).toFixed(0)}% conf</span>
              </span>
              <span className="h-3 w-px bg-line" />
              <span className="flex items-center gap-1.5 text-muted">
                <Activity className="h-3.5 w-3.5" aria-hidden="true" />
                last packet <span className="tnum">{formatSince(now - ward.lastTelemetryAt)}</span>
              </span>
            </div>

            {/* Risk legend — bands are never a mystery */}
            <div className="flex items-center gap-2 rounded-lg border border-line bg-panel/70 px-3 py-2 text-[11px]">
              {RISK_BANDS.map((band) => (
                <span key={band.level} className="flex items-center gap-1.5" title={band.detail}>
                  <RiskPill level={band.level} className="!px-1.5 !text-[10px]" />
                  <span className="tnum text-muted">{band.range}</span>
                </span>
              ))}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
          {beds.length === 0
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : beds.map((bed) =>
                bed.latest ? (
                  <BedCard
                    key={bed.device_id}
                    bed={bed}
                    now={now}
                    selected={selected === bed.device_id}
                    onOpen={(id) => setSelected(id)}
                  />
                ) : (
                  <SkeletonCard key={bed.device_id} label={`Awaiting ${bed.patient.bedLabel}`} />
                ),
              )}
        </div>

        <p className="mt-6 text-[10px] leading-relaxed text-muted/80">
          NeoScore is a clinical decision-support aid. Composite NIPS and sub-scores are derived
          on-device from landmark features; raw video never leaves the edge node. Low-confidence
          readings are visually de-emphasised — confirm against the infant before acting.
        </p>
      </main>

      {selectedBed && (
        <BedDetailDrawer
          bed={selectedBed}
          events={events}
          alarm={selectedAlarm}
          now={now}
          onClose={() => setSelected(null)}
          onAcknowledge={() => setSurface("modal")}
        />
      )}

      {unack.length > 0 && surface === "modal" && (
        <AlarmModal alarms={unack} resolveScore={resolveScore} onClose={() => setSurface("toast")} />
      )}
      {unack.length > 0 && surface === "toast" && (
        <AlarmToast alarms={unack} now={now} onExpand={() => setSurface("modal")} />
      )}
    </div>
  );
}
