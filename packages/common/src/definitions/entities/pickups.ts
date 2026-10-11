export const PICKUP_DEFINITIONS = {
  experience: { id: "experience", baseAmount: 1, shared: true },
  gold: { id: "gold", chance: 0.1, baseAmount: 1, shared: false, grantsCurrency: true },
} as const;
export const PICKUP_RULES = {
  initialHopMs: 300,
  lifetimeMs: 60000,
  capacity: 512,
  collectRadius: 22,
  attractionRadius: 140,
  speed: 280,
} as const;
