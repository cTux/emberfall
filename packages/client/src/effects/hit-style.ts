// Existing flash timings keep damage visible briefly without obscuring the next attack.
export const HIT_STYLE = {
  outlineRadius: 2,
  targetDurationMs: 220,
  screenDurationMs: 280,
  screenOpacity: 0.22,
  // The absent-hit timestamp is deliberately older than either flash lifetime at startup.
  missingHitAt: -10000,
  // Fixed pose resampling keeps party outlines one game pixel thick independent of source art.
  partyMaskPixels: 48,
  partyOutlinePixels: 50,
} as const;
