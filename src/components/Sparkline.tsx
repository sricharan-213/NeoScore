import { NIPS_MAX } from "@/lib/risk";
import { cn } from "@/lib/utils";

interface Props {
  values: number[];
  color: string;
  className?: string;
  /** Draw a faint threshold guide at NIPS >= 5 (severe band floor). */
  showThreshold?: boolean;
}

/** Lightweight 60s sparkline of the composite score (0–7). */
export function Sparkline({ values, color, className, showThreshold = true }: Props) {
  const W = 240;
  const H = 56;
  if (values.length < 2) {
    return <div className={cn("h-14 w-full rounded bg-line/30", className)} />;
  }
  const n = values.length;
  const x = (i: number) => (i / (n - 1)) * W;
  const y = (v: number) => H - (Math.max(0, Math.min(NIPS_MAX, v)) / NIPS_MAX) * (H - 6) - 3;

  let d = "";
  values.forEach((v, i) => {
    d += `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
  });
  const area = `${d}L${W},${H} L0,${H} Z`;
  const thresholdY = y(5);
  const lastX = x(n - 1);
  const lastY = y(values[n - 1]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={cn("h-14 w-full", className)}
      role="img"
      aria-label="Composite NIPS score over the last 60 seconds"
    >
      <defs>
        <linearGradient id={`spark-${color.replace(/[^a-z0-9]/gi, "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {showThreshold && (
        <line
          x1="0"
          x2={W}
          y1={thresholdY}
          y2={thresholdY}
          stroke="rgb(var(--muted))"
          strokeOpacity="0.35"
          strokeWidth="1"
          strokeDasharray="2 4"
        />
      )}
      <path d={area} fill={`url(#spark-${color.replace(/[^a-z0-9]/gi, "")})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r="3" fill={color} />
    </svg>
  );
}
