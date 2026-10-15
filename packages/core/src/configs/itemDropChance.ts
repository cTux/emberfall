import { EnemyType } from '@emberfall/common/enums';

export const itemDropChance = {
  [EnemyType.Normal]: 4,
  [EnemyType.Elite]: 15,
  [EnemyType.Boss]: 50,
} as const satisfies Record<EnemyType, number>;
