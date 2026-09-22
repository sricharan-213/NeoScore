/* ---------------------------------------------------------------------------
   NeoScore telemetry contract
   The dashboard ONLY ever receives derived numbers from the edge node.
   Raw video never leaves the device. Types below mirror the wire schema 1:1.
--------------------------------------------------------------------------- */

export type TelemetryStatus =
  | "CALM"
  | "MILD_DISCOMFORT"
  | "MODERATE_DISTRESS"
  | "CRITICAL_DISTRESS";

export interface TelemetryMetrics {
  facial_score: number; // 0–1
  brow_furrow_ratio: number;
  eye_squeeze_index: number;
  cry_score: number; // 0–2
  cry_fundamental_freq_hz: number;
  upper_limb_score: number; // 0–1
  lower_limb_score: number; // 0–1
  wrist_jerk_metric: number;
  ankle_jerk_metric: number;
  arousal_state_score: number; // 0–1
}

/** Exact edge → dashboard WebSocket payload, one message per second per bed. */
export interface TelemetryPayload {
  device_id: string;
  patient_pseudonym_id: string;
  timestamp: string; // ISO-8601
  nips_composite_score: number; // 0–7
  status: TelemetryStatus;
  metrics: TelemetryMetrics;
  confidence: number; // 0–1
  alert_trigger: boolean;
}

/* ------------------------------- derived -------------------------------- */

export type RiskLevel = "NORMAL" | "MODERATE" | "SEVERE";
export type LinkState = "LIVE" | "STALE" | "OFFLINE";

/**
 * A single point on the 8-hour trend. `gap === true` marks a stretch where the
 * edge node was offline and the local SQLite buffer had nothing to backfill —
 * rendered as a dotted segment rather than a silent skip.
 */
export interface TrendPoint {
  t: number; // epoch ms
  score: number;
  confidence: number;
  gap: boolean;
}

export interface Calibration {
  /** Per-patient baseline brow-furrow mean (μ) and spread (σ), not hardcoded. */
  baselineMean: number;
  baselineSigma: number;
  /** Rolling-mean jerk threshold τ for limb scores. */
  tauJerk: number;
  /** Acoustic F0 band edges for cry scoring (Hz). */
  cryWhimperHz: number;
  cryVigorousHz: number;
}

export type EventType =
  | "heel_prick"
  | "suctioning"
  | "positioning"
  | "feeding"
  | "medication"
  | "cuddle";

export interface ClinicalEvent {
  id: string;
  device_id: string;
  timestamp: number; // epoch ms
  type: EventType;
  label: string;
  nurse_id: string;
}

export interface PatientProfile {
  device_id: string;
  patient_pseudonym_id: string;
  bedLabel: string;
  gestationalAgeWeeks: number;
  correctedAgeWeeks: number;
  birthWeightGrams: number;
  dayOfLife: number;
  scenario: Scenario;
}

export type Scenario =
  | "stable"
  | "episodic"
  | "deteriorating"
  | "recovering"
  | "fussy";

export interface BedState {
  device_id: string;
  patient: PatientProfile;
  latest: TelemetryPayload | null;
  /** 1 Hz samples retained for the sparkline / raw telemetry pane. */
  window: TelemetryPayload[];
  /** 8-hour downsampled trend. */
  trend: TrendPoint[];
  lastReceivedAt: number;
  link: LinkState;
  calibration: Calibration;
  /** Short human-readable note on what the simulator is currently doing. */
  linkNote?: string;
}

/** An alarm that must be acknowledged with a mandatory note. */
export interface AlarmRecord {
  id: string;
  device_id: string;
  patient_pseudonym_id: string;
  bedLabel: string;
  triggered_at: number;
  peak_score: number;
  score_at_trigger: number;
  /** Populated on acknowledgement. */
  acknowledged_at: number | null;
  acknowledged_by: string | null;
  acknowledged_by_name: string | null;
  note: string | null;
}

export interface NurseSession {
  nurseId: string;
  name: string;
  role: string;
  ward: string;
  signedInAt: number;
}
