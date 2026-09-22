/* ---------------------------------------------------------------------------
   Acknowledgement audit trail
   Every alarm acknowledgement is logged with timestamp + nurse ID + note.
   Persisted locally (stand-in for the ward audit service / Convex mutation).
--------------------------------------------------------------------------- */

const STORAGE_KEY = "neoscore.audit.v1";

export interface AuditEntry {
  id: string;
  alarm_id: string;
  device_id: string;
  patient_pseudonym_id: string;
  nurse_id: string;
  nurse_name: string;
  note: string;
  acknowledged_at: number;
}

let cache: AuditEntry[] | null = null;
const listeners = new Set<() => void>();

function load(): AuditEntry[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as AuditEntry[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function persist(entries: AuditEntry[]) {
  cache = entries;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* storage unavailable — keep in-memory */
  }
  for (const l of listeners) l();
}

export function appendAuditEntry(entry: AuditEntry) {
  persist([entry, ...load()].slice(0, 500));
}

export function readAuditLog(): AuditEntry[] {
  return load();
}

export function clearAuditLog() {
  persist([]);
}

export function subscribeAudit(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
