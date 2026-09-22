import type { RiskLevel, TelemetryStatus } from "./types";

/**
 * NIPS composite → risk band.
 *   0–2 Normal · 3–4 Moderate · 5–7 Severe
 * These bands are the ONLY place the reserved status colours appear.
 */
export function riskFromScore(score: number): RiskLevel {
  if (score >= 5) return "SEVERE";
  if (score >= 3) return "MODERATE";
  return "NORMAL";
}

export const RISK_LABEL: Record<RiskLevel, string> = {
  NORMAL: "Normal",
  MODERATE: "Moderate",
  SEVERE: "Severe",
};

/** Text/foreground token for a risk level (clears WCAG AA in both themes). */
export const RISK_TEXT: Record<RiskLevel, string> = {
  NORMAL: "text-risk-normal",
  MODERATE: "text-risk-moderate",
  SEVERE: "text-risk-severe",
};

export const RISK_BORDER: Record<RiskLevel, string> = {
  NORMAL: "border-risk-normal/70",
  MODERATE: "border-risk-moderate/80",
  SEVERE: "border-risk-severe",
};

/** Subtle whole-card tint so a card reads as its state from across the room. */
export const RISK_TINT: Record<RiskLevel, string> = {
  NORMAL: "bg-risk-normal/[0.06]",
  MODERATE: "bg-risk-moderate/[0.09]",
  SEVERE: "bg-risk-severe/[0.12]",
};

/** CSS var name used for inline styles / chart strokes. */
export function riskVar(level: RiskLevel): string {
  return level === "SEVERE"
    ? "var(--risk-severe)"
    : level === "MODERATE"
      ? "var(--risk-moderate)"
      : "var(--risk-normal)";
}

export const RISK_HEX: Record<RiskLevel, string> = {
  // Static fallbacks used where CSS vars are awkward (canvas rendering).
  NORMAL: "#2E7D32",
  MODERATE: "#B26A00",
  SEVERE: "#C62828",
};

/**
 * Bright tints used on the always-navy chrome bar, where the light-theme
 * status tokens would fall below AA contrast.
 */
export const RISK_ON_CHROME: Record<RiskLevel, string> = {
  NORMAL: "#5FCD72",
  MODERATE: "#F0A83A",
  SEVERE: "#FF6B6B",
};

/** Risk legend used in tooltips/legends so bands are never a mystery. */
export const RISK_BANDS: Array<{ level: RiskLevel; range: string; detail: string }> = [
  { level: "NORMAL", range: "0–2", detail: "No or minimal distress cues" },
  { level: "MODERATE", range: "3–4", detail: "Moderate distress cues" },
  { level: "SEVERE", range: "5–7", detail: "Severe — acknowledge required" },
];

const STATUS_COPY: Record<TelemetryStatus, string> = {
  CALM: "Calm · no distress cues",
  MILD_DISCOMFORT: "Mild discomfort cues",
  MODERATE_DISTRESS: "Moderate distress cues",
  CRITICAL_DISTRESS: "Critical distress cues",
};

export function statusCopy(status: TelemetryStatus): string {
  return STATUS_COPY[status];
}

/** Threshold line value on the 8-hour NIPS graph. */
export const NIPS_ALARM_THRESHOLD = 4;
export const NIPS_MAX = 7;
