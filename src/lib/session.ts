/* ---------------------------------------------------------------------------
   Nurse session
   Lightweight local session used to attribute acknowledgements. In production
   this is issued by the ward identity provider; the dashboard only needs the
   nurse ID + display name.
--------------------------------------------------------------------------- */

import { useSyncExternalStore } from "react";
import type { NurseSession } from "./types";

const STORAGE_KEY = "neoscore.session.v1";

let cache: NurseSession | null | undefined;
const listeners = new Set<() => void>();

function read(): NurseSession | null {
  if (cache !== undefined) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as NurseSession) : null;
  } catch {
    cache = null;
  }
  return cache;
}

function emit() {
  for (const l of listeners) l();
}

export function signIn(session: NurseSession) {
  cache = session;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
  emit();
}

export function signOut() {
  cache = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  emit();
}

export function getSession(): NurseSession | null {
  return read();
}

export function useSession(): NurseSession | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => read(),
    () => read(),
  );
}
