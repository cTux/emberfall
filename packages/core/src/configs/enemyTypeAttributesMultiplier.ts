import { EnemyType } from '@emberfall/common/enums';

export const enemyTypeAttributesMultiplier = {
  [EnemyType.Normal]: 1,
  [EnemyType.Elite]: 3,
  [EnemyType.Boss]: 10,
} as const satisfies Record<EnemyType, number>;
