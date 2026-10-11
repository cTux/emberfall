export const AILMENT_DEFINITIONS = {
  bleed: { chance: 0.1, durationMs: 5000, tickMs: 1000, damagePerStack: 1 },
  poison: { chance: 0.1, durationMs: 5000, tickMs: 1000, damagePerStack: 1 },
  burn: { chance: 0.1, durationMs: 5000, tickMs: 1000, damagePerStack: 1 },
  roots: { durationMs: 5000, maxStacks: 1, slowFraction: 0.1, affectsBoss: false },
} as const;
