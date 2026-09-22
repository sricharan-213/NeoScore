import { Activity, Radio } from "lucide-react";
import type { BedState } from "@/lib/types";
import { RISK_BORDER, RISK_TEXT, RISK_TINT, NIPS_MAX, riskFromScore, statusCopy } from "@/lib/risk";
import { cn, formatSince } from "@/lib/utils";
import type { RiskLevel } from "@/lib/types";
import { AnimatedNumber } from "./AnimatedNumber";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { RiskPill } from "./RiskSignal";
import { Sparkline } from "./Sparkline";

interface Props {
  bed: BedState;
  selected: boolean;
  onOpen: (deviceId: string) => void;
  now: number;
}

const RISK_STROKE: Record<RiskLevel, string> = {
  NORMAL: "var(--risk-normal)",
  MODERATE: "var(--risk-moderate)",
  SEVERE: "var(--risk-severe)",
};

export function BedCard({ bed, selected, onOpen, now }: Props) {
  const score = bed.latest?.nips_composite_score ?? 0;
  const risk = riskFromScore(score);
  const live = bed.link === "LIVE";
  const since = now - bed.lastReceivedAt;
  const sparkValues = bed.window.slice(-60).map((p) => p.nips_composite_score);

  return (
    <button
      type="button"
      onClick={() => onOpen(bed.device_id)}
      aria-label={`Open ${bed.patient.bedLabel}, ${bed.patient.patient_pseudonym_id}, risk ${risk}, score ${score} of ${NIPS_MAX}`}
      className={cn(
        "group relative flex w-full flex-col gap-3 overflow-hidden rounded-xl border-2 p-4 text-left transition-all duration-200",
        "bg-panel/80 hover:-translate-y-0.5 hover:shadow-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70",
        RISK_BORDER[risk],
        RISK_TINT[risk],
        risk === "SEVERE" && "animate-severe-pulse",
        !live && "opacity-80 saturate-[0.35]",
        selected && "ring-2 ring-accent/70",
      )}
    >
      {/* left risk spine — the card reads as its state from across the room */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          risk === "SEVERE"
            ? "bg-risk-severe"
            : risk === "MODERATE"
              ? "bg-risk-moderate"
              : "bg-risk-normal",
        )}
      />

      <div className="flex items-start justify-between gap-2 pl-1.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-semibold">{bed.patient.bedLabel}</span>
            <span
              className={cn(
                "inline-block h-1.5 w-1.5 rounded-full",
                live ? "bg-accent" : "bg-muted",
                live && "animate-soft-pulse",
              )}
              aria-hidden="true"
            />
          </div>
          <div className="truncate font-mono text-[11px] tracking-tight text-muted">
            {bed.patient.patient_pseudonym_id}
          </div>
        </div>
        <RiskPill level={risk} />
      </div>

      <div className="flex items-end justify-between gap-3 pl-1.5">
        <div className="flex items-end gap-1">
          <AnimatedNumber
            value={score}
            className={cn("text-5xl font-semibold leading-none tracking-tight", RISK_TEXT[risk])}
          />
          <span className="mb-1 text-sm font-medium text-muted">/{NIPS_MAX}</span>
        </div>
        <div className="min-w-0 flex-1 text-right">
          <div className="flex items-center justify-end gap-1 text-[11px] text-muted">
            <Activity className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="truncate">
              {bed.latest ? statusCopy(bed.latest.status) : "No telemetry"}
            </span>
          </div>
        </div>
      </div>

      <Sparkline
        values={sparkValues}
        color={RISK_STROKE[risk]}
        className="pl-1.5"
      />

      <div className="flex items-center justify-between gap-2 pl-1.5">
        {bed.latest ? (
          <ConfidenceMeter confidence={bed.latest.confidence} />
        ) : (
          <span className="text-[10px] text-muted">—</span>
        )}
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
            live
              ? "border-line text-muted"
              : bed.link === "OFFLINE"
                ? "border-risk-severe/50 bg-risk-severe/[0.12] text-risk-severe"
                : "border-line bg-canvas/60 text-muted",
          )}
          title={bed.linkNote ?? undefined}
        >
          {!live && <Radio className="h-3 w-3" aria-hidden="true" />}
          <span className="tnum">
            {live ? "live" : `${bed.link === "OFFLINE" ? "offline" : "stale"} · ${formatSince(since)}`}
          </span>
        </span>
      </div>
    </button>
  );
}
