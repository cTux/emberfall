// Preserve encounter balance: cap live enemies and keep melee/caster attacks on their existing cadence.
// Probabilities, warning/range budgets and per-member multipliers are existing gameplay tuning.
export const ENEMY_RULES = {
  damageCooldownMs: 1000,
  maxAlive: 160,
  bruteChance: 0.1,
  casterChance: 0.1,
  casterStopRange: 210,
  projectileSpeed: 210,
  projectileLifetimeMs: 2500,
  spawnWarningMs: 1000,
  healthPerMember: 1.75,
  experiencePerMember: 1.2,
} as const;
