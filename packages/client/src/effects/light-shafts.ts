// Existing world-anchored shafts use wide, widely spaced beams with a slow twelve-second drift.
export const LIGHT_SHAFTS = {
  slope: 0.6,
  width: 160,
  drift: 12,
  spacing: 420,
  periodMs: 12000,
  leadingFadeStop: 0.2,
  trailingFadeStop: 0.8,
} as const;
