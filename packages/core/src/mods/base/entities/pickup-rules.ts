// Preserve pickup presentation: 300 ms initial hop, one-minute lifetime and the existing 512-item budget.
// Attraction speed/radii retain the current collection feel; the original calibration has no numeric proof.
export const PICKUP_RULES = {
  initialHopMs: 300,
  lifetimeMs: 60000,
  capacity: 512,
  collectRadius: 22,
  attractionRadius: 140,
  speed: 280,
} as const;
