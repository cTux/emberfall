import type { EnemyArt, EnemyDefinition } from '../../../content/contracts.ts';

// Existing archetype calibration: runners trade body size for speed, brutes speed for reach and size.
// Windup/cooldown values preserve their established attack telegraphs; no benchmarked optimum is claimed.
export const ENEMY_STATS = {
  skeleton: { speed: 64, radius: 10, size: 48, reach: 40, windup: 650, cooldown: 1000 },
  runner: { speed: 104, radius: 8, size: 32, reach: 32, windup: 500, cooldown: 900 },
  brute: { speed: 40, radius: 16, size: 68, reach: 65, windup: 1000, cooldown: 1600 },
  caster: { speed: 54, radius: 10, size: 44, reach: 260, windup: 900, cooldown: 1600 },
} as const satisfies Record<
  EnemyArt,
  Omit<EnemyDefinition, 'id' | 'behavior' | 'art' | 'hitPoints' | 'damage'>
>;
