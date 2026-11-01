/** Existing combat geometry, shared by hit checks and the debug overlay. */
// These pixel-sized bounds retain the calibrated sprite/feet hit geometry; no retuning is intended.
export const COLLISION = {
  companionRadius: 12,
  feetOffset: 15,
  playerProjectileRadius: 4,
  enemyProjectileRadius: 5,
} as const;
