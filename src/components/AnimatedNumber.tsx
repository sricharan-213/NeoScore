import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { prefersReducedMotion } from "@/lib/theme";

interface Props {
  value: number;
  decimals?: number;
  durationMs?: number;
  className?: string;
}

/**
 * Rolls between values over ~200–300ms instead of hard-jumping, so live
 * telemetry reads as "alive" and the eye is drawn to what changed.
 */
export function AnimatedNumber({ value, decimals = 0, durationMs = 260, className }: Props) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    fromRef.current = value;
    if (from === to) return;
    if (prefersReducedMotion()) {
      setDisplay(to);
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, durationMs]);

  return (
    <span className={cn("tnum", className)}>{display.toFixed(decimals)}</span>
  );
}
