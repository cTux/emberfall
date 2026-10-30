import type { EnemyArt, EnemyDefinition } from '../../../content/contracts.ts';
export const BOSS_DEFINITIONS = {
  hollowWarden: { id: 'hollowWarden', name: 'The Hollow Warden', archetype: 'brute', kind: 'boss' },
} as const;
export const ENEMY_STATS = {
  skeleton: { speed: 64, radius: 10, size: 48, reach: 40, windup: 650, cooldown: 1000 },
  runner: { speed: 104, radius: 8, size: 32, reach: 32, windup: 500, cooldown: 900 },
  brute: { speed: 40, radius: 16, size: 68, reach: 65, windup: 1000, cooldown: 1600 },
  caster: { speed: 54, radius: 10, size: 44, reach: 260, windup: 900, cooldown: 1600 },
} as const satisfies Record<
  EnemyArt,
  Omit<EnemyDefinition, 'id' | 'behavior' | 'art' | 'hitPoints' | 'damage'>
>;

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
