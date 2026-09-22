import { useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ClipboardList, ShieldCheck, Siren } from "lucide-react";
import { readAuditLog, subscribeAudit } from "@/lib/audit";
import { useAlarms, useBeds, useWard } from "@/lib/store";
import { useSession } from "@/lib/session";
import { useNow } from "@/lib/useNow";
import { TopBar } from "@/components/TopBar";
import { formatDateTime, formatSince } from "@/lib/utils";

export function Audit() {
  const entries = useSyncExternalStore(subscribeAudit, readAuditLog, readAuditLog);
  const alarms = useAlarms();
  const beds = useBeds();
  const ward = useWard();
  const session = useSession();
  const now = useNow(1000);

  const unack = alarms.filter((a) => a.acknowledged_at === null);
  const bedLabel = (deviceId: string) =>
    beds.find((b) => b.device_id === deviceId)?.patient.bedLabel ?? deviceId;

  return (
    <div className="min-h-screen bg-canvas">
      <TopBar ward={ward} wardName={session?.ward ?? "NICU · Ward A"} onOpenAlarms={() => {}} />

      <main className="mx-auto max-w-[1200px] px-3 py-4 sm:px-5 sm:py-6">
        <Link
          to="/ward"
          className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back to command center
        </Link>

        <h1 className="text-lg font-semibold tracking-tight">Alarm center &amp; audit trail</h1>
        <p className="mt-0.5 text-[12px] text-muted">
          Every acknowledgement is logged with a timestamp, nurse ID, and note.
        </p>

        <section className="mt-5">
          <h2 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            <Siren className="h-4 w-4" aria-hidden="true" /> Awaiting acknowledgement
            <span className="tnum rounded-full border border-line px-1.5 text-[10px]">
              {unack.length}
            </span>
          </h2>
          {unack.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-line bg-panel/60 px-4 py-3 text-[12px] text-muted">
              <ShieldCheck className="h-4 w-4 text-risk-normal" aria-hidden="true" />
              No outstanding alarms. All severe events have been acknowledged.
            </div>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-lg border border-risk-severe/40">
              {unack.map((a) => (
                <li key={a.id} className="flex items-center gap-3 bg-risk-severe/[0.07] px-4 py-2.5">
                  <Siren className="h-4 w-4 shrink-0 animate-soft-pulse text-risk-severe" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-semibold">
                      {a.bedLabel}{" "}
                      <span className="font-mono text-[11px] font-normal text-muted">
                        {a.patient_pseudonym_id}
                      </span>
                    </div>
                    <div className="tnum text-[10px] text-muted">
                      triggered {formatDateTime(a.triggered_at)} · peak {a.peak_score}/7
                    </div>
                  </div>
                  <span className="tnum shrink-0 text-[11px] text-muted">
                    {formatSince(now - a.triggered_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-6">
          <h2 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            <ClipboardList className="h-4 w-4" aria-hidden="true" /> Acknowledgement log
            <span className="tnum rounded-full border border-line px-1.5 text-[10px]">
              {entries.length}
            </span>
          </h2>
          {entries.length === 0 ? (
            <p className="rounded-lg border border-line bg-panel/60 px-4 py-3 text-[12px] text-muted">
              No acknowledgements recorded yet.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-line">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-chrome text-[10px] uppercase tracking-[0.12em] text-white/70">
                    <th className="px-4 py-2 font-medium">Acknowledged</th>
                    <th className="px-4 py-2 font-medium">Bed</th>
                    <th className="px-4 py-2 font-medium">Nurse</th>
                    <th className="px-4 py-2 font-medium">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {entries.map((e) => (
                    <tr key={e.id} className="align-top text-[12px]">
                      <td className="tnum whitespace-nowrap px-4 py-2.5 text-muted">
                        {formatDateTime(e.acknowledged_at)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-semibold">{bedLabel(e.device_id)}</div>
                        <div className="font-mono text-[10px] text-muted">
                          {e.patient_pseudonym_id}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div>{e.nurse_name}</div>
                        <div className="font-mono text-[10px] text-muted">{e.nurse_id}</div>
                      </td>
                      <td className="max-w-[380px] px-4 py-2.5 text-muted">{e.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
