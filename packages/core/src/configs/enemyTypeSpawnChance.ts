import { EnemyType } from '@emberfall/common/enums';

// Check entries in order until one succeeds; bosses are triggered by the timer.
export const enemyTypeSpawnChance = {
  [EnemyType.Elite]: 5,
  [EnemyType.Normal]: 100,
} as const satisfies Record<Exclude<EnemyType, typeof EnemyType.Boss>, number>;
