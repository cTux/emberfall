// Atlas dimensions/rows match the shipped pickup/effect sheets, not gameplay hitboxes.
export const PROJECTILE_STYLE = {
  // Fallback strokes match the original arrow shaft/root border and expanding explosion rim.
  rootsStroke: 2,
  arrowOutlineStroke: 4,
  arrowShaftStroke: 2,
  explosionStroke: 3,
  frameMs: 100,
  arrowFrames: 4,
  effectFrames: 3,
  arrowPixels: 44,
  rootsPixels: 24,
  fireballPixels: 48,
  rootsRow: 3,
  fireballRow: 2,
  pickupCell: 64,
  effectCell: 128,
  // Preserve the existing legacy fallback when an explosion has no duration/radius metadata.
  explosionDurationMs: 350,
  explosionRadius: 100,
  explosionStartScale: 0.3,
  explosionGrowth: 0.7,
  // Talent art contains four animation frames and three columns for each of four classes.
  talentColumns: 3,
  talentRows: 12,
  talentFrames: 4,
  talentLastFrame: 3,
  talentPixels: 200,
  // Retain the original ten-mote expanding talent burst around its atlas image.
  talentParticles: 10,
  talentStartRadius: 20,
  talentRadiusGrowth: 110,
  talentParticleRadius: 3,
} as const;
