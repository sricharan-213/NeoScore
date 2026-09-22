import { cn } from "@/lib/utils";

interface Props {
  confidence: number;
  className?: string;
}

/**
 * Deliberately deprioritised: thin, muted, below the score. Low-confidence
 * readings must not carry the same visual weight as high-confidence ones.
 */
export function ConfidenceMeter({ confidence, className }: Props) {
  const pct = Math.round(confidence * 100);
  const low = confidence < 0.7;
  return (
    <div
      className={cn("group flex items-center gap-1.5", className)}
      title={`Model confidence ${pct}%${
        low ? " — low-confidence reading, interpret with caution" : ""
      }`}
    >
      <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-muted/80">
        conf
      </span>
      <span className="relative h-1 w-8 overflow-hidden rounded-full bg-line">
        <span
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-[width] duration-500",
            low ? "bg-muted" : "bg-muted/80",
          )}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="tnum text-[10px] text-muted">{pct}%</span>
      {low && (
        <span className="rounded border border-line px-1 text-[9px] uppercase tracking-wide text-muted">
          low
        </span>
      )}
    </div>
  );
}
