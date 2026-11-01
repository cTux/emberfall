import { MILLISECONDS_PER_SECOND } from '@emberfall/common';

// Keep the existing five-second moving average so brief bursts do not dominate DPS.
const DAMAGE_WINDOW_SECONDS = 5;

export const COMBAT_TUNING = {
  // Derive timestamps and DPS division from the same window so their units cannot drift.
  damageWindowMs: DAMAGE_WINDOW_SECONDS * MILLISECONDS_PER_SECOND,
  // The same five-second window must divide accumulated damage to produce damage per second.
  damageWindowSeconds: DAMAGE_WINDOW_SECONDS,
  // Preserve the fallback arrow's three additional victims when content omits pierce.
  defaultArrowPierce: 3,
  // Separate gold and equipment drops from the XP pickup by the existing ten world units.
  lootOffset: 10,
  // Preserve one second for roots metadata; roots do not themselves deal periodic damage.
  rootsTickMs: 1000,
  // Preserve the existing 64-unit roots travel padding; its original calibration is undocumented.
  rootsTravelPadding: 64,
  // Existing six-unit substeps keep fast shots from skipping narrow enemy hitboxes.
  projectileStep: 6,
  // Discard residual travel below one thousandth of a world unit instead of retaining an effectively spent projectile.
  projectileRemainingEpsilon: 0.001,
} as const;
