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
// Preserve the existing 960x640 logical camera and 320-pixel ground tiles; tall scenery needs a 300-pixel culling margin.
export const FOREST_VIEW = {
  width: 960,
  height: 640,
  tileSize: 320,
  sceneryMargin: 300,
  demoX: 2400,
  demoY: 1280,
  demoSwayMs: 25000,
  demoSway: 70,
} as const;
// Existing handheld-light placement follows the sprite's hand, with a modest 110-pixel warm glow.
export const FOREST_PLAYER_LIGHT = {
  leftFacing: 2,
  leftHand: -15,
  rightHand: 12,
  height: 28,
  radius: 110,
  strength: 0.18,
} as const;
