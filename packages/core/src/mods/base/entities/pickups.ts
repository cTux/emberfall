// Existing rewards grant one shared XP per kill and one personal gold on the 10% gold roll.
export const PICKUP_DEFINITIONS = {
  experience: { id: 'experience', baseAmount: 1, shared: true },
  gold: { id: 'gold', chance: 0.1, baseAmount: 1, shared: false, grantsCurrency: true },
} as const;
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
