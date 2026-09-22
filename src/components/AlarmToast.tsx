import { BellRing, ChevronUp, Siren } from "lucide-react";
import type { AlarmRecord } from "@/lib/types";
import { cn, formatSince } from "@/lib/utils";

interface Props {
  alarms: AlarmRecord[];
  now: number;
  onExpand: () => void;
}

/**
 * The alarm surface can collapse to this pinned toast so the ward stays in
 * peripheral vision — but it can never be dismissed, only acknowledged.
 */
export function AlarmToast({ alarms, now, onExpand }: Props) {
  if (!alarms.length) return null;
  return (
    <div
      role="alert"
      className="fixed bottom-4 right-4 z-50 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border-2 border-risk-severe bg-panel shadow-panel animate-fade-in"
    >
      <div className="flex items-center gap-2 bg-risk-severe/[0.16] px-3 py-2">
        <Siren className="h-4 w-4 animate-soft-pulse text-risk-severe" aria-hidden="true" />
        <span className="text-[12px] font-semibold text-risk-severe">
          {alarms.length} alarm{alarms.length > 1 ? "s" : ""} awaiting acknowledgement
        </span>
        <span className="ml-auto rounded-full bg-risk-severe px-1.5 py-0.5 text-[10px] font-bold text-white">
          {alarms.length}
        </span>
      </div>
      <div className="space-y-1 px-3 py-2">
        {alarms.slice(0, 3).map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-2 text-[11px]">
            <span className="truncate">
              <span className="font-semibold">{a.bedLabel}</span>{" "}
              <span className="font-mono text-muted">{a.patient_pseudonym_id}</span>
            </span>
            <span className="tnum shrink-0 text-muted">
              peak {a.peak_score} · {formatSince(now - a.triggered_at)}
            </span>
          </div>
        ))}
        {alarms.length > 3 && (
          <div className="text-[10px] text-muted">+{alarms.length - 3} more in queue</div>
        )}
      </div>
      <button
        type="button"
        onClick={onExpand}
        className={cn(
          "flex w-full items-center justify-center gap-1.5 bg-risk-severe py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90",
        )}
      >
        <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
        Open &amp; acknowledge
        <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
