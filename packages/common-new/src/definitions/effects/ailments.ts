export const AILMENT_DEFINITIONS = {
  bleed: { chance: 0.1, durationMs: 5000, tickMs: 1000, damagePerStack: 1 },
  poison: { chance: 0.1, durationMs: 5000, tickMs: 1000, damagePerStack: 1 },
  burn: { chance: 0.1, durationMs: 5000, tickMs: 1000, damagePerStack: 1 },
  roots: { durationPerStackMs: 3000, immobilizesBoss: false },
} as const;
