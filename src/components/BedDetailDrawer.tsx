import { useEffect } from "react";
import { BellRing, X } from "lucide-react";
import type { AlarmRecord, BedState, ClinicalEvent } from "@/lib/types";
import { NIPS_ALARM_THRESHOLD, NIPS_MAX, RISK_TEXT, riskFromScore, riskVar, statusCopy } from "@/lib/risk";
import { deriveRadarAxes, metricRows, rollingJerk } from "@/lib/derive";
import { EVENT_GLYPH } from "./eventGlyphs";
import { cn, formatDateTime, formatSince, formatTimeShort } from "@/lib/utils";
import { AnimatedNumber } from "./AnimatedNumber";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { RadarBreakdown } from "./RadarBreakdown";
import { RiskPill } from "./RiskSignal";
import { TrendChart } from "./TrendChart";

interface Props {
  bed: BedState;
  events: ClinicalEvent[];
  alarm: AlarmRecord | null;
  now: number;
  onClose: () => void;
  onAcknowledge: (alarm: AlarmRecord) => void;
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-line px-5 py-4 last:border-b-0">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          {title}
        </h3>
        {hint && <span className="text-[10px] text-muted/80">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

export function BedDetailDrawer({ bed, events, alarm, now, onClose, onAcknowledge }: Props) {
  const score = bed.latest?.nips_composite_score ?? 0;
  const risk = riskFromScore(score);
  const axes = deriveRadarAxes(bed);
  const jerk = rollingJerk(bed);
  const rows = metricRows(bed.latest);
  const bedEvents = events.filter((e) => e.device_id === bed.device_id).slice(-6).reverse();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-label={`${bed.patient.bedLabel} detail`}
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[600px] flex-col border-l border-line bg-panel shadow-drawer animate-drawer-in"
    >
      <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold">{bed.patient.bedLabel}</h2>
            <RiskPill level={risk} verbose={false} />
            {bed.link !== "LIVE" && (
              <span className="rounded-full border border-risk-severe/50 bg-risk-severe/[0.12] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-risk-severe">
                {bed.link === "OFFLINE" ? "Offline" : "Stale"}
              </span>
            )}
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-muted">
            {bed.patient.patient_pseudonym_id} · {bed.device_id}
          </div>
          <div className="mt-0.5 text-[10px] text-muted">
            GA {bed.patient.gestationalAgeWeeks}w · corrected {bed.patient.correctedAgeWeeks}w ·{" "}
            {bed.patient.birthWeightGrams} g · day {bed.patient.dayOfLife} of life
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="flex items-end justify-end gap-0.5">
              <AnimatedNumber
                value={score}
                className={cn("text-3xl font-semibold leading-none", RISK_TEXT[risk])}
              />
              <span className="mb-0.5 text-xs text-muted">/{NIPS_MAX}</span>
            </div>
            <div className="tnum mt-1 text-[10px] text-muted">
              last packet {formatSince(now - bed.lastReceivedAt)}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:bg-canvas hover:text-ink"
            aria-label="Close detail panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {alarm && alarm.acknowledged_at === null && (
        <div className="flex items-center justify-between gap-3 border-b border-risk-severe/40 bg-risk-severe/[0.1] px-5 py-2.5">
          <div className="flex items-center gap-2 text-[12px] text-risk-severe">
            <BellRing className="h-4 w-4 animate-soft-pulse" aria-hidden="true" />
            <span className="font-semibold">Severe distress sustained — acknowledgement required</span>
          </div>
          <button
            type="button"
            onClick={() => onAcknowledge(alarm)}
            className="shrink-0 rounded-lg bg-risk-severe px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Acknowledge
          </button>
        </div>
      )}

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <Section
          title="8-hour NIPS degradation"
          hint={`threshold ${NIPS_ALARM_THRESHOLD} · 0–${NIPS_MAX}`}
        >
          <TrendChart trend={bed.trend} events={events} riskColor={riskVar(risk)} />
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded" style={{ background: riskVar(risk) }} />
              Live composite
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-0.5 w-4 rounded"
                style={{
                  backgroundImage: `repeating-linear-gradient(90deg, ${"rgb(var(--muted))"} 0 2px, transparent 2px 4px)`,
                }}
              />
              Gap · edge offline (no backfill)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex h-3 w-3 items-center justify-center rounded-full border border-line">
                <svg viewBox="-12 -12 24 24" className="h-2.5 w-2.5">
                  <path d={EVENT_GLYPH.heel_prick} stroke="rgb(var(--muted))" strokeWidth="2.4" fill="none" strokeLinecap="round" />
                </svg>
              </span>
              Clinical intervention
            </span>
          </div>
        </Section>

        <Section title="Decomposed vector" hint="which signal is driving the score">
          <RadarBreakdown axes={axes} riskColor={riskVar(risk)} />
          <ul className="mt-2 space-y-1.5">
            {axes.map((axis) => (
              <li key={axis.axis} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-[11px] text-muted">{axis.axis}</span>
                <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ width: `${axis.value * 100}%`, background: riskVar(risk) }}
                  />
                </span>
                <span className="tnum w-10 shrink-0 text-right text-[11px]">
                  {axis.value.toFixed(2)}
                </span>
                <span className="w-8 shrink-0 text-right font-mono text-[10px] text-muted">
                  S={axis.subScore}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Raw telemetry" hint={bed.latest ? formatDateTime(Date.parse(bed.latest.timestamp)) : undefined}>
          {bed.latest ? (
            <>
              <div className="mb-3 flex items-center justify-between rounded-lg border border-line bg-canvas/50 px-3 py-2">
                <div className="text-[12px]">
                  <div className="font-semibold">{statusCopy(bed.latest.status)}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted">
                    {bed.latest.status} · alert_trigger {String(bed.latest.alert_trigger)}
                  </div>
                </div>
                <ConfidenceMeter confidence={bed.latest.confidence} />
              </div>
              <dl className="divide-y divide-line overflow-hidden rounded-lg border border-line">
                {rows.map((row) => (
                  <div key={row.key} className="flex items-baseline justify-between gap-3 px-3 py-1.5">
                    <div className="min-w-0">
                      <dt className="truncate text-[11px]">{row.label}</dt>
                      <dd className="truncate text-[10px] text-muted">{row.sub}</dd>
                    </div>
                    <span className="tnum shrink-0 text-[12px] font-medium">{row.value}</span>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <p className="text-[12px] text-muted">Awaiting first telemetry packet…</p>
          )}
        </Section>

        <Section title="Per-patient calibration" hint="thresholds are configurable, not hardcoded">
          <dl className="grid grid-cols-2 gap-2 text-[11px]">
            <CalibrationItem label="Baseline μ (BFR)" value={bed.calibration.baselineMean.toFixed(3)} />
            <CalibrationItem label="Baseline σ" value={bed.calibration.baselineSigma.toFixed(3)} />
            <CalibrationItem
              label="Furrow trigger (μ − 1.8σ)"
              value={(bed.calibration.baselineMean - 1.8 * bed.calibration.baselineSigma).toFixed(3)}
            />
            <CalibrationItem label="ESI trigger" value="< 0.18" />
            <CalibrationItem
              label="τ_jerk (rolling mean)"
              value={bed.calibration.tauJerk.toFixed(2)}
            />
            <CalibrationItem
              label="Rolling jerk now"
              value={`${jerk.arms.toFixed(2)} / ${jerk.legs.toFixed(2)}`}
            />
            <CalibrationItem label="Cry whimper band" value={`${bed.calibration.cryWhimperHz}–${bed.calibration.cryVigorousHz} Hz`} />
            <CalibrationItem label="Cry vigorous band" value={`≥ ${bed.calibration.cryVigorousHz} Hz`} />
          </dl>
          <p className="mt-2 text-[10px] leading-relaxed text-muted">
            v2: these rules can be swapped for a trained classifier on the same feature set without
            changing the JSON contract. The dashboard consumes scores, not models.
          </p>
        </Section>

        <Section title="Recent interventions" hint={`${bedEvents.length} shown`}>
          {bedEvents.length ? (
            <ul className="space-y-1.5">
              {bedEvents.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center gap-3 rounded-lg border border-line bg-canvas/40 px-3 py-1.5"
                >
                  <svg viewBox="-12 -12 24 24" className="h-4 w-4 shrink-0">
                    <path
                      d={EVENT_GLYPH[e.type]}
                      stroke="rgb(var(--muted))"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="flex-1 text-[11px]">{e.label}</span>
                  <span className="font-mono text-[10px] text-muted">{e.nurse_id}</span>
                  <span className="tnum text-[10px] text-muted">{formatTimeShort(e.timestamp)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-muted">No interventions logged in this window.</p>
          )}
        </Section>
      </div>
    </aside>
  );
}

function CalibrationItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-canvas/40 px-2.5 py-1.5">
      <div className="text-[9px] uppercase tracking-[0.1em] text-muted">{label}</div>
      <div className="tnum text-[12px] font-medium">{value}</div>
    </div>
  );
}
