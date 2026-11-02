export const EnemyKind = {
  Skeleton: 'skeleton',
  Runner: 'runner',
  Brute: 'brute',
  Caster: 'caster',
} as const;

/** Registered enemy archetype IDs are extensible; constants above name base content. */
export type EnemyKind = string;
