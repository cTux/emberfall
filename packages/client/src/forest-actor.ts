// Existing actor projection uses a 48-pixel body with its feet 15 pixels below the logical position.
// The 45/48 anchor and faint trails preserve approved sprite placement; they do not change collision rules.
export const FOREST_ACTOR = {
  footOffset: 15,
  bodyHeight: 45,
  playerSize: 48,
  deathFadeMs: 700,
  fallenRow: 7,
  windupRow: 5,
  releaseRow: 6,
  deadOpacity: 0.35,
  motionOpacity: 0.13,
  trailScale: 0.7,
  queryMargin: 100,
  drawMargin: 80,
  movingEpsilon: 0.05,
  bossHealthGap: 10,
  bossDebuffGap: 12,
  enemyDebuffHalfWidth: 17,
  enemyDebuffGap: 14,
} as const;
