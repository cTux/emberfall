// Existing breeze calibration combines two slow waves; independent spatial phases avoid synchronized foliage.
export const WIND = {
  xPhase: 0.013,
  yPhase: 0.017,
  primaryPeriodMs: 1600,
  secondaryPeriodMs: 2700,
  secondaryPhase: 1.7,
  secondaryWeight: 0.3,
  grassShear: 0.07,
  foliageShear: 0.018,
  // Grass sprites are authored at sixteen pixels, unlike larger shrub/tree silhouettes.
  grassSpritePixels: 16,
} as const;
