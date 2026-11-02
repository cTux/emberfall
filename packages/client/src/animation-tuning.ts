// Existing gait calibration keeps the four enemy poses at 120 ms and six player poses at 80 ms.
export const ANIMATION = {
  attackMs: 260,
  windupFraction: 0.4,
  enemyStepMs: 120,
  enemySteps: 4,
  playerStepMs: 80,
  releaseMs: 180,
  breathMs: 550,
  breathScale: 0.012,
} as const;
