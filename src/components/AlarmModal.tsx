import { useEffect, useMemo, useRef, useState } from "react";
import { BellRing, CircleAlert, Lock, Siren } from "lucide-react";
import type { AlarmRecord } from "@/lib/types";
import { telemetryStore } from "@/lib/store";
import { useSession } from "@/lib/session";
import { cn, formatDuration, formatSince, formatTimeShort } from "@/lib/utils";
import { AnimatedNumber } from "./AnimatedNumber";

const QUICK_NOTES = [
  "Infant settled with containment/handling",
  "Analgesia administered — clinician notified",
  "Repositioned and re-scored; improving",
  "Procedure-related transient distress",
];

interface Props {
  alarms: AlarmRecord[];
  resolveScore: (deviceId: string) => number;
  onClose: () => void;
}

function elapsedLabel(from: number, now: number) {
  return formatDuration(now - from);
}

export function AlarmModal({ alarms, resolveScore, onClose }: Props) {
  const session = useSession();
  const [index, setIndex] = useState(0);
  const [note, setNote] = useState("");
  const [error, setError] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const safeIndex = Math.min(index, Math.max(0, alarms.length - 1));
  const active = alarms[safeIndex];

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    textareaRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [safeIndex]);

  const remaining = alarms.length;
  const canSubmit = useMemo(() => note.trim().length >= 4, [note]);

  if (!active) return null;

  const submit = () => {
    if (!canSubmit) {
      setError(true);
      textareaRef.current?.focus();
      return;
    }
    telemetryStore.acknowledge(active.id, session ?? {
      nurseId: "RN-UNKNOWN",
      name: "Unattributed",
      role: "Nurse",
      ward: "NICU",
      signedInAt: Date.now(),
    }, note.trim());
    setNote("");
    setError(false);
    setIndex(0);
    if (remaining <= 1) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#02060f]/80 p-4 backdrop-blur-sm animate-fade-in"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="alarm-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-xl border-2 border-risk-severe bg-panel shadow-panel">
        <div className="flex items-center gap-3 bg-risk-severe/[0.14] px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-risk-severe/20">
            <Siren className="h-6 w-6 animate-soft-pulse text-risk-severe" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="alarm-title" className="text-[15px] font-semibold text-risk-severe">
              Severe distress alarm
            </h2>
            <p className="text-[11px] text-muted">
              {remaining > 1 ? `Alarm ${safeIndex + 1} of ${remaining} pending` : "Requires acknowledgement"}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-end gap-0.5">
              <AnimatedNumber
                value={resolveScore(active.device_id)}
                className="text-3xl font-semibold leading-none text-risk-severe"
              />
              <span className="mb-0.5 text-xs text-muted">/7</span>
            </div>
            <div className="tnum text-[10px] text-muted">peak {active.peak_score}</div>
          </div>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-line bg-canvas/50 px-3 py-2.5 text-[12px]">
            <div>
              <div className="text-[10px] uppercase tracking-[0.12em] text-muted">Patient</div>
              <div className="mt-0.5 font-semibold">{active.bedLabel}</div>
              <div className="font-mono text-[11px] text-muted">{active.patient_pseudonym_id}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.12em] text-muted">Triggered</div>
              <div className="tnum mt-0.5 font-semibold">
                {formatTimeShort(active.triggered_at)}
              </div>
              <div className="tnum text-[11px] text-muted">
                {formatSince(now - active.triggered_at)} · sustained {elapsedLabel(active.triggered_at, now)}
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-[10px] uppercase tracking-[0.12em] text-muted">Device</div>
              <div className="mt-0.5 font-mono text-[11px]">{active.device_id}</div>
            </div>
          </div>

          <div>
            <label htmlFor="ack-note" className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium">
              <Lock className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
              Acknowledgement note <span className="text-risk-severe">*</span>
            </label>
            <textarea
              id="ack-note"
              ref={textareaRef}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (error) setError(false);
              }}
              rows={2}
              placeholder="One line: what you observed and did…"
              className={cn(
                "w-full resize-none rounded-lg border bg-canvas px-3 py-2 text-[13px] outline-none transition-colors placeholder:text-muted/70",
                error
                  ? "border-risk-severe focus:border-risk-severe"
                  : "border-line focus:border-accent",
              )}
            />
            <div className="mt-1 flex items-center justify-between">
              <span className={cn("text-[10px]", error ? "text-risk-severe" : "text-muted")}>
                {error ? "A note is required before this alarm can be cleared." : "Minimum 4 characters."}
              </span>
              <span className="tnum text-[10px] text-muted">{note.trim().length}/240</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK_NOTES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setNote(q);
                    setError(false);
                  }}
                  className="rounded-full border border-line px-2 py-0.5 text-[10px] text-muted transition-colors hover:border-accent hover:text-ink"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-line bg-canvas/40 px-3 py-2 text-[11px] text-muted">
            <CircleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Logged against{" "}
              <span className="font-mono text-ink">{session?.nurseId ?? "RN-UNKNOWN"}</span>
              {session?.name ? ` (${session.name})` : ""} with a timestamp. This dialog cannot be
              dismissed until acknowledged.
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 text-[11px] text-muted transition-colors hover:text-ink"
            title="Collapse to a pinned alert — it stays until acknowledged"
          >
            <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
            Keep ward visible
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className={cn(
              "rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-opacity",
              canSubmit ? "bg-risk-severe hover:opacity-90" : "cursor-not-allowed bg-risk-severe/40",
            )}
          >
            Nurse acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}
