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
