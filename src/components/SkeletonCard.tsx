import { cn } from "@/lib/utils";

/** Never show a blank card — a skeleton communicates "awaiting first packet". */
export function SkeletonCard({ label }: { label?: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-panel/60 p-4">
      <div className="flex items-center justify-between">
        <div className="skeleton-shimmer h-3 w-20 rounded bg-line/60" />
        <div className="skeleton-shimmer h-4 w-16 rounded-full bg-line/60" />
      </div>
      <div className="skeleton-shimmer h-10 w-16 rounded bg-line/60" />
      <div className="skeleton-shimmer h-12 w-full rounded bg-line/40" />
      <div className="flex items-center justify-between">
        <div className="skeleton-shimmer h-2.5 w-24 rounded bg-line/50" />
        <div className="skeleton-shimmer h-2.5 w-12 rounded bg-line/50" />
      </div>
      <p className={cn("text-[10px] uppercase tracking-[0.14em] text-muted/70")}>
        {label ?? "Awaiting first telemetry packet"}
      </p>
    </div>
  );
}
