import type { BedState, TelemetryMetrics, TelemetryPayload } from "./types";
import { clamp } from "./utils";

export interface RadarAxis {
  axis: string;
  short: string;
  /** Normalised 0–1 for the radar polygon. */
  value: number;
  /** Human-readable raw value for the tooltip/table. */
  raw: string;
  /** Which sub-score this axis feeds. */
  subScore: 0 | 1 | 2;
}

/**
 * All five axes are DERIVED from numbers already on the wire — the dashboard
 * never sees video, so nothing here invents a signal it wasn't sent.
 */
export function deriveRadarAxes(bed: BedState): RadarAxis[] {
  const m = bed.latest?.metrics;
  const cal = bed.calibration;
  if (!m) return EMPTY_AXES;

  const furrowTension = clamp(
    (cal.baselineMean - m.brow_furrow_ratio) / (cal.baselineSigma * 3),
    0,
    1,
  );
  const squeeze = clamp((0.4 - m.eye_squeeze_index) / 0.32, 0, 1);
  const facial = Math.max(furrowTension, squeeze);

  const cry = clamp((m.cry_fundamental_freq_hz - 300) / 500, 0, 1);
  const arm = clamp(m.wrist_jerk_metric / 8, 0, 1);
  const leg = clamp(m.ankle_jerk_metric / 8, 0, 1);
  const agitation = centroidAgitation(bed);

  return [
    {
      axis: "Facial Tension",
      short: "Face",
      value: facial,
      raw: `BFR ${m.brow_furrow_ratio.toFixed(3)} · ESI ${m.eye_squeeze_index.toFixed(3)}`,
      subScore: m.facial_score as 0 | 1,
    },
    {
      axis: "Acoustic Cry",
      short: "Cry",
      value: cry,
      raw: `F0 ${m.cry_fundamental_freq_hz.toFixed(1)} Hz`,
      subScore: m.cry_score as 0 | 1 | 2,
    },
    {
      axis: "Arm Jerk",
      short: "Arms",
      value: arm,
      raw: `jerk ${m.wrist_jerk_metric.toFixed(2)}`,
      subScore: m.upper_limb_score as 0 | 1,
    },
    {
      axis: "Leg Jerk",
      short: "Legs",
      value: leg,
      raw: `jerk ${m.ankle_jerk_metric.toFixed(2)}`,
      subScore: m.lower_limb_score as 0 | 1,
    },
    {
      axis: "Centroid Agitation",
      short: "Agitation",
      value: agitation,
      raw: `σ² ${(agitation * 2).toFixed(2)} · arousal ${m.arousal_state_score}`,
      subScore: m.arousal_state_score as 0 | 1,
    },
  ];
}

export const EMPTY_AXES: RadarAxis[] = [
  { axis: "Facial Tension", short: "Face", value: 0, raw: "—", subScore: 0 },
  { axis: "Acoustic Cry", short: "Cry", value: 0, raw: "—", subScore: 0 },
  { axis: "Arm Jerk", short: "Arms", value: 0, raw: "—", subScore: 0 },
  { axis: "Leg Jerk", short: "Legs", value: 0, raw: "—", subScore: 0 },
  { axis: "Centroid Agitation", short: "Agitation", value: 0, raw: "—", subScore: 0 },
];

/** Variance of centroid motion over the retained 30s window (0–1 normalised). */
export function centroidAgitation(bed: BedState): number {
  const samples = bed.window.slice(-30);
  if (samples.length < 3) return bed.latest?.metrics.arousal_state_score ? 0.6 : 0;
  const centroids = samples.map(
    (p) => (p.metrics.wrist_jerk_metric + p.metrics.ankle_jerk_metric) / 2,
  );
  const mean = centroids.reduce((a, b) => a + b, 0) / centroids.length;
  const variance =
    centroids.reduce((a, b) => a + (b - mean) ** 2, 0) / centroids.length;
  return clamp(variance / 2, 0, 1);
}

/** Mean rolling jerk across the retained window — the τ_jerk comparison value. */
export function rollingJerk(bed: BedState): { arms: number; legs: number } {
  const samples = bed.window.slice(-60);
  if (!samples.length) return { arms: 0, legs: 0 };
  const arms = samples.reduce((a, p) => a + p.metrics.wrist_jerk_metric, 0) / samples.length;
  const legs = samples.reduce((a, p) => a + p.metrics.ankle_jerk_metric, 0) / samples.length;
  return { arms, legs };
}

export interface MetricRow {
  key: keyof TelemetryMetrics;
  label: string;
  value: string;
  sub: string;
}

export function metricRows(payload: TelemetryPayload | null): MetricRow[] {
  const m = payload?.metrics;
  return [
    { key: "facial_score", label: "Facial score (S_face)", value: String(m?.facial_score ?? "—"), sub: "0–1" },
    { key: "brow_furrow_ratio", label: "Brow furrow ratio (BFR)", value: fmt(m?.brow_furrow_ratio, 3), sub: "‖P107−P336‖ / ‖P33−P263‖" },
    { key: "eye_squeeze_index", label: "Eye squeeze index (ESI)", value: fmt(m?.eye_squeeze_index, 3), sub: "threshold 0.18" },
    { key: "cry_score", label: "Cry score (S_cry)", value: String(m?.cry_score ?? "—"), sub: "0–2" },
    { key: "cry_fundamental_freq_hz", label: "Cry fundamental (F0)", value: `${fmt(m?.cry_fundamental_freq_hz, 1)} Hz`, sub: "MFCC · <400 / 400–600 / ≥600" },
    { key: "upper_limb_score", label: "Upper-limb score (S_arms)", value: String(m?.upper_limb_score ?? "—"), sub: "rolling jerk > τ" },
    { key: "lower_limb_score", label: "Lower-limb score (S_legs)", value: String(m?.lower_limb_score ?? "—"), sub: "rolling jerk > τ" },
    { key: "wrist_jerk_metric", label: "Wrist jerk metric", value: fmt(m?.wrist_jerk_metric, 2), sub: "3rd derivative of landmark position" },
    { key: "ankle_jerk_metric", label: "Ankle jerk metric", value: fmt(m?.ankle_jerk_metric, 2), sub: "3rd derivative of landmark position" },
    { key: "arousal_state_score", label: "Arousal score (S_arousal)", value: String(m?.arousal_state_score ?? "—"), sub: "centroid-motion variance · 30s" },
  ];
}

function fmt(v: number | undefined, digits: number) {
  return v === undefined ? "—" : v.toFixed(digits);
}
