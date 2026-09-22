import type { EventType } from "@/lib/types";

/**
 * Minimal 24×24 stroke paths drawn inside the trend event markers. Each glyph
 * is a distinct shape so event types are distinguishable without colour.
 */
export const EVENT_GLYPH: Record<EventType, string> = {
  // syringe / heel-prick
  heel_prick: "M-8 6h10l6-6M-5 3v6M-2 -0v6",
  // suction catheter
  suctioning: "M-8 0h12M4 0a5 5 0 1 0 0 0.01M4 -5v10",
  // reposition arrows
  positioning: "M-8 0h12M2 -4l4 4-4 4",
  // feeding drop
  feeding: "M0 -7c4 5 6 7 6 9a6 6 0 1 1 -12 0c0-2 2-4 6-9z",
  // medication capsule
  medication: "M-7 -4h14v8h-14zM0 -4v8",
  // kangaroo care heart
  cuddle: "M0 6c-7-4-9-8-9-11a4 4 0 0 1 9-3 4 4 0 0 1 9 3c0 3-2 7-9 11z",
};
