import { useSyncExternalStore } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "neoscore.theme.v1";
const listeners = new Set<() => void>();

function read(): Theme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark") return raw;
  } catch {
    /* ignore */
  }
  // NICUs run low ambient light — dark is the default.
  return "dark";
}

let current: Theme | null = null;

function apply(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

function emit() {
  for (const l of listeners) l();
}

export function getTheme(): Theme {
  if (current === null) current = read();
  return current;
}

export function setTheme(theme: Theme) {
  current = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
  apply(theme);
  emit();
}

export function toggleTheme() {
  setTheme(getTheme() === "dark" ? "light" : "dark");
}

export function initTheme() {
  apply(getTheme());
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    getTheme,
    getTheme,
  );
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}
