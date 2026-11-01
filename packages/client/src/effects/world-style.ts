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

// Existing sparse firefly grid and bounded drift retain the current ambient density and motion.
export const FIREFLIES = {
  cullMargin: 40,
  cellSize: 160,
  seedColumns: 30,
  seedRows: 16,
  columnSeed: 179,
  rowSeed: 83,
  opacity: 0.25,
  flickerPeriodMs: 900,
  flickerRange: 0.2,
  xScatter: 135,
  yScatter: 111,
  xPeriodMs: 2400,
  yPeriodMs: 1900,
  xDrift: 18,
  yDrift: 25,
} as const;

// Preserve the current clear central view and softly darkened screen perimeter.
export const VIGNETTE = { outerScale: 0.65, clearRadiusScale: 0.25 } as const;

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
