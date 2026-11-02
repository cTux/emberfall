// Existing starts keep targets within the sweep and move each successful target to its opposite half.
export const ACTIVITY_ZONES = {
  initialMin: 0.1,
  initialSpan: 0.66,
  rightMin: 0.65,
  leftMin: 0.04,
  nextSpan: 0.17,
} as const;
