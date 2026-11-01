// Existing stain calibration: low-opacity elliptical ground marks extend beneath actor feet.
export const BLOOD_STYLE = {
  opacity: 0.5,
  feetOffset: 15,
  horizontalCullMargin: 40,
  verticalCullMargin: 20,
  outlinePoints: 24,
  minimumRadius: 9,
  radiusSpread: 19,
  groundFlattening: 0.55,
  droplets: 10,
  dropletDistance: 24,
  dropletDistanceSpread: 13,
  dropletRadiusSpread: 2.5,
} as const;

// The existing 32-bit LCG parameters keep each event's stain stable across frames.
export const STAIN_RANDOM = {
  multiplier: 1664525,
  increment: 1013904223,
  range: 4294967296,
} as const;
