import { AlertTriangle, CheckCircle2, Siren } from "lucide-react";
import type { RiskLevel } from "@/lib/types";
import { RISK_LABEL } from "@/lib/risk";
import { cn } from "@/lib/utils";

export function RiskIcon({ level, className }: { level: RiskLevel; className?: string }) {
  const Icon = level === "SEVERE" ? Siren : level === "MODERATE" ? AlertTriangle : CheckCircle2;
  return <Icon className={className} aria-hidden="true" />;
}

interface Props {
  level: RiskLevel;
  className?: string;
  showText?: boolean;
  /** Buttons/toggles don't need the "risk level:" prefix. */
  verbose?: boolean;
}

/**
 * Status colour is never the ONLY signal: every badge carries an icon and a
 * text label so colour-blind staff can triage.
 */
export function RiskPill({ level, className, showText = true, verbose = true }: Props) {
  const tone =
    level === "SEVERE"
      ? "text-risk-severe border-risk-severe/50 bg-risk-severe/[0.12]"
      : level === "MODERATE"
        ? "text-risk-moderate border-risk-moderate/50 bg-risk-moderate/[0.12]"
        : "text-risk-normal border-risk-normal/50 bg-risk-normal/[0.12]";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        tone,
        className,
      )}
      aria-label={verbose ? `Risk level: ${RISK_LABEL[level]}` : undefined}
    >
      <RiskIcon level={level} className="h-3.5 w-3.5" />
      {showText && RISK_LABEL[level]}
    </span>
  );
}
