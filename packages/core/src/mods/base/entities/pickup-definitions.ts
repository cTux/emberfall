// Existing rewards grant one shared XP per kill and one personal gold on the 10% gold roll.
export const PICKUP_DEFINITIONS = {
  experience: { id: 'experience', baseAmount: 1, shared: true },
  gold: { id: 'gold', chance: 0.1, baseAmount: 1, shared: false, grantsCurrency: true },
} as const;
