import { EnemyType } from '@emberfall/common/enums';

// Each full 100% guarantees an item; the remainder rolls for one more.
export const itemCountDropPercent = {
  [EnemyType.Normal]: 1,
  [EnemyType.Elite]: { min: 50, max: 150 },
  [EnemyType.Boss]: { min: 100, max: 500 },
} as const satisfies Record<EnemyType, number | { min: number; max: number }>;
