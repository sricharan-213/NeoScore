import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8", className)} aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="8" fill="rgb(var(--chrome))" />
      <rect
        x="1"
        y="1"
        width="30"
        height="30"
        rx="8"
        fill="none"
        stroke="rgb(var(--accent) / 0.55)"
        strokeWidth="1"
      />
      {/* stylised NIPS waveform + neonate monitor sweep */}
      <path
        d="M6 18.5h3.2l1.8-4.6 2.4 9 2.2-12 2.3 7.6 1.9-4.2h4.6"
        fill="none"
        stroke="rgb(var(--accent))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Brand({
  compact = false,
  onChrome = false,
  className,
}: {
  compact?: boolean;
  onChrome?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      {!compact && (
        <div className="leading-none">
          <div
            className={cn(
              "text-[15px] font-semibold tracking-tight",
              onChrome ? "text-white" : "text-ink",
            )}
          >
            Neo<span className={onChrome ? "text-white/70" : "text-accent"}>Score</span>
          </div>
          <div
            className={cn(
              "mt-0.5 text-[10px] uppercase tracking-[0.18em]",
              onChrome ? "text-white/55" : "text-muted",
            )}
          >
            NICU pain intelligence
          </div>
        </div>
      )}
    </div>
  );
}
