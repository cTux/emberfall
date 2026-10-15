export const EnemyKind = {
  Skeleton: 'skeleton',
  Runner: 'runner',
  Brute: 'brute',
  Caster: 'caster',
} as const;

export type EnemyKind = (typeof EnemyKind)[keyof typeof EnemyKind];
