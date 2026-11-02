// The existing 32-bit LCG parameters keep each event's stain stable across frames.
export const STAIN_RANDOM = {
  multiplier: 1664525,
  increment: 1013904223,
  range: 4294967296,
} as const;
