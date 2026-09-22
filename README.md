# NeoScore

A real-time NICU pain-monitoring command center. Edge nodes (phone-mounted
cameras) score infant distress on-device and publish derived numbers over the
local network; the ward dashboard renders a multi-bed picture built for
information hierarchy, alarm visibility, and honest latency perception.

## Run

```bash
bun install
bun run dev        # Vite dev server (0.0.0.0)
bun run typecheck  # tsc -b --noEmit
bun run build      # static output in dist/
```

## Architecture

```
edge node (on-device)                    ward browser
─────────────────────                    ────────────
MediaPipe Face Mesh (468 pts, 25 FPS) ┐
MediaPipe BlazePose  (33 nodes, 20 FPS)├─► deterministic feature scores
MFCC acoustic F0                      ┘         │
                                                ▼
                              NIPS = S_face + S_cry + S_arms + S_legs + S_arousal
                                                │  JSON, 1 msg/s/bed
                                                ▼
                                       ws://<device-ip>:5000/telemetry
                                                │
                                                ▼
                        normalized store keyed by device_id → ward UI
```

Raw video **never** leaves the edge node — the dashboard only ever receives the
numbers below. Thresholds (μ_baseline, σ, τ_jerk) are calibrated per patient.

### Telemetry payload (the exact wire contract)

```jsonc
{
  "device_id": "iQOO-NICU-BED-04",
  "patient_pseudonym_id": "NEO-88219",
  "timestamp": "2026-09-17T00:06:41.120Z",
  "nips_composite_score": 5,
  "status": "CRITICAL_DISTRESS",
  "metrics": {
    "facial_score": 1,
    "brow_furrow_ratio": 0.284,
    "eye_squeeze_index": 0.112,
    "cry_score": 2,
    "cry_fundamental_freq_hz": 642.8,
    "upper_limb_score": 1,
    "lower_limb_score": 1,
    "wrist_jerk_metric": 4.82,
    "ankle_jerk_metric": 3.91,
    "arousal_state_score": 0
  },
  "confidence": 0.942,
  "alert_trigger": true
}
```

### Scoring (v1, explainable by construction)

| Sub-score | Range | Rule |
| --- | --- | --- |
| `S_face` | 0–1 | `BFR < μ − 1.8σ` OR `ESI < 0.18` |
| `S_cry` | 0–2 | `F0 < 400` / `400–600` / `≥ 600 Hz` |
| `S_arms` | 0–1 | rolling mean of `J(t)` (3rd derivative of position) > `τ_jerk` |
| `S_legs` | 0–1 | rolling mean of `J(t)` > `τ_jerk` |
| `S_arousal` | 0–1 | centroid-motion variance over a 30 s window |

Risk bands: **0–2 Normal · 3–4 Moderate · 5–7 Severe**. The three status
colours are reserved for risk state only and are never used decoratively.

### Simulator

The repo ships no edge hardware, so `src/lib/simulator.ts` emulates a 12-bed
ward: a per-bed latent distress process drives the same deterministic scoring
pipeline, seeds an 8-hour history (including dotted "no backfill" gaps and
clinical event markers), and then streams 1 Hz payloads. Swap it for a real
WebSocket client by replacing the store's ingest source in `src/lib/store.ts`.

## Data retention

- Rolling 8-hour trend per bed (30 s buckets), then downsampled/discarded.
- 60 s of 1 Hz samples per bed for sparkline and raw telemetry.
- Drops to stale after 5 s without a packet; offline nodes backfill on reconnect.
- Acknowledgements are logged with timestamp + nurse ID + note (`src/lib/audit.ts`).

## Roadmap

v2 replaces the fixed-threshold rules with a small supervised classifier
(e.g. gradient-boosted trees) over the same feature set, without changing the
JSON contract.
