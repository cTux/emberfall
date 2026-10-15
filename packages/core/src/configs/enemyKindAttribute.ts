import { EnemyKind } from '@emberfall/common/enums';

export const enemyKindAttribute = {
  [EnemyKind.Skeleton]: { hitPoints: 10, damage: 3 },
  [EnemyKind.Runner]: { hitPoints: 10, damage: 3 },
  [EnemyKind.Brute]: { hitPoints: 30, damage: 9 },
  [EnemyKind.Caster]: { hitPoints: 7, damage: 3 },
} as const satisfies Record<EnemyKind, { hitPoints: number; damage: number }>;
