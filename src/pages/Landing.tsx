import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BellRing,
  Camera,
  Cpu,
  Gauge,
  Layers,
  Lock,
  Radar as RadarIcon,
  ScanFace,
  Timer,
  Waves,
} from "lucide-react";
import { RISK_BANDS, NIPS_ALARM_THRESHOLD } from "@/lib/risk";
import type { RiskLevel } from "@/lib/types";
import { Brand } from "@/components/Brand";
import { RiskPill } from "@/components/RiskSignal";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const fade = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

const SUBSCORES = [
  { name: "S_face", range: "0–1", formula: "BFR < μ − 1.8σ  OR  ESI < 0.18", note: "Brow furrow ratio + eye squeeze index from 468 facial landmarks" },
  { name: "S_cry", range: "0–2", formula: "F0 < 400 / 400–600 / ≥ 600 Hz", note: "Acoustic fundamental from MFCC on the microphone input" },
  { name: "S_arms", range: "0–1", formula: "rolling mean of J(t) > τ_jerk", note: "Third derivative of wrist landmark position (jerk)" },
  { name: "S_legs", range: "0–1", formula: "rolling mean of J(t) > τ_jerk", note: "Third derivative of ankle landmark position (jerk)" },
  { name: "S_arousal", range: "0–1", formula: "variance of centroid motion > threshold", note: "Centroid displacement variance over a 30 s sliding window" },
];

const PREVIEW: Array<{ bed: string; id: string; score: number; level: RiskLevel; trend: number[] }> = [
  { bed: "Bed 04", id: "NEO-88219", score: 6, level: "SEVERE", trend: [3, 4, 4, 5, 5, 6, 6, 6] },
  { bed: "Bed 06", id: "NEO-88231", score: 4, level: "MODERATE", trend: [2, 3, 3, 4, 3, 4, 4, 4] },
  { bed: "Bed 01", id: "NEO-88201", score: 1, level: "NORMAL", trend: [1, 1, 2, 1, 1, 0, 1, 1] },
];

export function Landing() {
  const session = useSession();
  const primaryTo = session ? "/ward" : "/auth?returnTo=%2Fward";

  return (
    <div className="min-h-screen bg-canvas">
      {/* Hero */}
      <div className="relative overflow-hidden bg-chrome text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.55) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at 70% 10%, black, transparent 72%)",
            WebkitMaskImage: "radial-gradient(ellipse at 70% 10%, black, transparent 72%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-6">
          <nav className="flex items-center justify-between">
            <Brand onChrome />
            <div className="flex items-center gap-2">
              <Link
                to="/audit"
                className="hidden rounded-lg px-3 py-1.5 text-[12px] text-white/70 transition-colors hover:text-white sm:block"
              >
                Alarm center
              </Link>
              <Link
                to={primaryTo}
                className="rounded-lg border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[12px] font-medium transition-colors hover:bg-white/[0.12]"
              >
                {session ? "Open command center" : "Nurse sign in"}
              </Link>
            </div>
          </nav>

          <div className="mt-16 grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/70">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                Clinical decision support · NICU
              </span>
              <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
                See the whole ward,
                <br />
                <span className="text-white/60">one second at a time.</span>
              </h1>
              <p className="mt-5 max-w-xl text-[14px] leading-relaxed text-white/70">
                NeoScore turns phone-mounted cameras into continuous, objective pain monitoring.
                Landmark features are scored on-device into the NIPS composite; the ward sees a live
                command center built for information hierarchy, alarm visibility, and honest latency.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to={primaryTo}
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-[13px] font-semibold text-chrome transition-transform hover:-translate-y-0.5"
                >
                  {session ? "Open ward command center" : "Enter the ward"}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/auth?returnTo=%2Faudit"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-[13px] font-medium text-white/80 transition-colors hover:bg-white/[0.08]"
                >
                  View acknowledgement audit
                </Link>
              </div>

              <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-white/10 pt-6">
                {[
                  { k: "1 Hz", v: "telemetry per bed" },
                  { k: "25 FPS", v: "face landmarking" },
                  { k: "0 bytes", v: "video leaves device" },
                ].map((s) => (
                  <div key={s.k}>
                    <dt className="tnum text-xl font-semibold">{s.k}</dt>
                    <dd className="text-[11px] text-white/55">{s.v}</dd>
                  </div>
                ))}
              </dl>
            </motion.div>

            {/* Ward preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="relative"
            >
              <div className="rounded-2xl border border-white/12 bg-white/[0.04] p-4 backdrop-blur">
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-white/60">
                    <Activity className="h-3.5 w-3.5" aria-hidden="true" />
                    Live ward preview
                  </span>
                  <span className="flex items-center gap-2 text-[10px] text-white/45">
                    <span className="h-1.5 w-1.5 animate-soft-pulse rounded-full bg-accent" />
                    12 beds · 28 ms
                  </span>
                </div>
                <div className="space-y-2.5">
                  {PREVIEW.map((b) => (
                    <PreviewCard key={b.bed} {...b} />
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                    Reserved risk palette
                  </span>
                  <div className="flex items-center gap-2">
                    {RISK_BANDS.map((band) => (
                      <span key={band.level} className="flex items-center gap-1">
                        <RiskPill level={band.level} showText={false} verbose={false} className="!px-1" />
                        <span className="tnum text-[10px] text-white/55">{band.range}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-2 text-center text-[10px] text-white/35">
                Illustrative sample — severity colours appear only for risk state, never decoratively.
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <motion.div {...fade}>
          <Eyebrow icon={Layers}>The pipeline</Eyebrow>
          <h2 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
            From an edge device to a ward-wide picture, in under a second.
          </h2>
        </motion.div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Camera,
              step: "01 · Capture",
              title: "On-device landmarking",
              body: "MediaPipe Face Mesh (468 landmarks) and BlazePose (33 nodes) run on the phone NPU. Frame data never leaves the device — no video stream exists on the wire.",
            },
            {
              icon: Cpu,
              step: "02 · Score",
              title: "Deterministic feature pipeline",
              body: "Brow furrow, eye squeeze, acoustic F0, limb jerk, and centroid variance are combined into the five NIPS sub-scores. Thresholds are calibrated per patient, not hardcoded.",
            },
            {
              icon: RadarIcon,
              step: "03 · Surface",
              title: "Ward command center",
              body: "One normalized store keyed by device ID. Bed cards inherit their risk state, severe beds escalate and sort to the top, and every alarm demands a named acknowledgement.",
            },
          ].map((c, i) => (
            <motion.div
              key={c.step}
              {...fade}
              transition={{ duration: 0.45, delay: i * 0.06, ease: "easeOut" }}
              className="rounded-2xl border border-line bg-panel p-6"
            >
              <c.icon className="h-5 w-5 text-accent" aria-hidden="true" />
              <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                {c.step}
              </div>
              <h3 className="mt-1.5 text-[15px] font-semibold">{c.title}</h3>
              <p className="mt-2 text-[12px] leading-relaxed text-muted">{c.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Scoring decomposition */}
      <section className="border-y border-line bg-panel">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <motion.div {...fade} className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <Eyebrow icon={ScanFace}>Explainable by construction</Eyebrow>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                The composite is a sum, not a black box.
              </h2>
              <p className="mt-4 text-[13px] leading-relaxed text-muted">
                Version 1 needs no labelled infant dataset. Scores come from explicit
                feature-engineering rules on pretrained landmarks, so every point on the composite can
                be traced to a signal a clinician can interrogate. The threshold module is isolated, so
                a trained classifier can replace the rules later without changing the JSON contract.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2 font-mono text-[12px]">
                NIPS = S_face + S_cry + S_arms + S_legs + S_arousal
              </div>
              <p className="mt-3 text-[11px] text-muted">
                Alarm threshold at NIPS ≥ {NIPS_ALARM_THRESHOLD} (severe band 5–7) must be sustained
                before the ward is alarmed.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-line">
              <table className="w-full border-collapse text-left text-[12px]">
                <thead>
                  <tr className="bg-chrome text-[10px] uppercase tracking-[0.12em] text-white/70">
                    <th className="px-4 py-2.5 font-medium">Signal</th>
                    <th className="px-4 py-2.5 font-medium">Range</th>
                    <th className="px-4 py-2.5 font-medium">Rule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-canvas">
                  {SUBSCORES.map((s) => (
                    <tr key={s.name} className="align-top">
                      <td className="px-4 py-3">
                        <div className="font-mono text-[12px] font-semibold">{s.name}</div>
                        <div className="mt-0.5 text-[10px] leading-snug text-muted">{s.note}</div>
                      </td>
                      <td className="tnum px-4 py-3 text-muted">{s.range}</td>
                      <td className="px-4 py-3 font-mono text-[11px]">{s.formula}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Design principles */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <motion.div {...fade}>
          <Eyebrow icon={Gauge}>Design constraints</Eyebrow>
          <h2 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
            Built around how a nurse actually reads a room.
          </h2>
        </motion.div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Layers,
              title: "Information hierarchy",
              body: "Composite score first, decoding second, confidence last. Radar and raw telemetry sit one deliberate click away, never competing with the number.",
            },
            {
              icon: BellRing,
              title: "Alarm visibility",
              body: "Severe beds pulse and rise to the top of the grid. Alarms cannot be dismissed until a named nurse leaves a note — colour is always backed by an icon and text.",
            },
            {
              icon: Timer,
              title: "Latency perception",
              body: "Every card shows when it last heard from its node. Data older than five seconds desaturates and stamps its age, so stale numbers never masquerade as live ones.",
            },
          ].map((c, i) => (
            <motion.div
              key={c.title}
              {...fade}
              transition={{ duration: 0.45, delay: i * 0.06, ease: "easeOut" }}
              className="rounded-2xl border border-line bg-panel p-6"
            >
              <c.icon className="h-5 w-5 text-accent" aria-hidden="true" />
              <h3 className="mt-4 text-[15px] font-semibold">{c.title}</h3>
              <p className="mt-2 text-[12px] leading-relaxed text-muted">{c.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Privacy + data */}
      <section className="border-y border-line bg-panel">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[1fr_1fr]">
          <motion.div {...fade}>
            <Eyebrow icon={Lock}>Privacy by architecture</Eyebrow>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              The dashboard only ever receives numbers.
            </h2>
            <p className="mt-4 text-[13px] leading-relaxed text-muted">
              Inference runs entirely on the edge node. The transport is a single JSON message per
              second per bed over the local network — no frames, no clips, no faces in transit.
            </p>
          </motion.div>
          <motion.ul {...fade} className="space-y-3 self-center">
            {[
              { icon: Waves, t: "One message per second per bed over local WebSocket" },
              { icon: Activity, t: "Normalized store keyed by device ID, 8-hour rolling trend" },
              { icon: Lock, t: "72-hour encrypted local buffer; backfills on reconnect" },
              { icon: Timer, t: "Missing stretches render as dotted segments, never silent skips" },
            ].map((r) => (
              <li
                key={r.t}
                className="flex items-start gap-3 rounded-xl border border-line bg-canvas px-4 py-3"
              >
                <r.icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                <span className="text-[12px] leading-relaxed">{r.t}</span>
              </li>
            ))}
          </motion.ul>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <motion.div
          {...fade}
          className="relative overflow-hidden rounded-3xl bg-chrome px-8 py-12 text-white sm:px-12"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(108,158,255,0.7), transparent 45%), radial-gradient(circle at 85% 70%, rgba(108,158,255,0.45), transparent 40%)",
            }}
          />
          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Open the command center.
              </h2>
              <p className="mt-3 text-[13px] leading-relaxed text-white/70">
                Twelve monitored beds, live NIPS composites, decomposed vectors, and an alarm queue
                that will not clear itself.
              </p>
            </div>
            <Link
              to={primaryTo}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-[13px] font-semibold text-chrome transition-transform hover:-translate-y-0.5"
            >
              {session ? "Go to ward" : "Sign in as a nurse"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <p className="relative mt-8 border-t border-white/10 pt-5 text-[10px] leading-relaxed text-white/40">
            Clinical decision-support prototype. Composite NIPS is an aid to, not a replacement for,
            bedside assessment. Roadmap: v2 supervised classifier on the same feature set, swap-in
            without a contract change.
          </p>
        </motion.div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6">
          <Brand />
          <span className="text-[11px] text-muted">NeoScore · NICU pain intelligence</span>
        </div>
      </footer>
    </div>
  );
}

function Eyebrow({ icon: Icon, children }: { icon: typeof Layers; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {children}
    </span>
  );
}

function PreviewCard({
  bed,
  id,
  score,
  level,
  trend,
}: {
  bed: string;
  id: string;
  score: number;
  level: RiskLevel;
  trend: number[];
}) {
  const stroke =
    level === "SEVERE" ? "var(--risk-severe)" : level === "MODERATE" ? "var(--risk-moderate)" : "var(--risk-normal)";
  const border =
    level === "SEVERE" ? "border-risk-severe" : level === "MODERATE" ? "border-risk-moderate" : "border-risk-normal/70";
  const tint =
    level === "SEVERE" ? "bg-risk-severe/[0.14]" : level === "MODERATE" ? "bg-risk-moderate/[0.12]" : "bg-risk-normal/[0.08]";

  const W = 120;
  const H = 28;
  const path = trend
    .map((v, i) => {
      const x = (i / (trend.length - 1)) * W;
      const y = H - (Math.min(7, v) / 7) * (H - 6) - 3;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className={cn("flex items-center gap-3 rounded-xl border-2 px-3 py-2.5", border, tint)}>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-semibold">{bed}</span>
          {level === "SEVERE" && (
            <span className="h-1.5 w-1.5 animate-soft-pulse rounded-full bg-risk-severe" />
          )}
        </div>
        <div className="font-mono text-[10px] text-white/50">{id}</div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-7 w-16 shrink-0">
        <path d={path} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div className="ml-auto flex items-end gap-0.5">
        <span className="tnum text-2xl font-semibold leading-none" style={{ color: stroke }}>
          {score}
        </span>
        <span className="text-[10px] text-white/40">/7</span>
      </div>
      <RiskPill level={level} showText={false} verbose={false} className="!px-1.5" />
    </div>
  );
}
