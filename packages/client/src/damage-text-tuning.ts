// Existing combat-label calibration gives each number a fixed 750 ms flight and short initial pop.
export const DAMAGE_TEXT = {
  lifetimeMs: 750,
  lanes: 5,
  centerLane: 2,
  popMs: 80,
  initialScale: 0.8,
  popGrowth: 0.55,
  settleScale: 0.35,
  settleMs: 140,
  laneGap: 7,
  laneSpread: 12,
  rise: 42,
  fadeAtMs: 450,
  fadeMs: 300,
  mergeWindowMs: 10,
  criticalStroke: 7,
  normalStroke: 3,
} as const;
