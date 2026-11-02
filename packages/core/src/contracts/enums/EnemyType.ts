export const EnemyType = {
  Normal: 'normal',
  Elite: 'elite',
  Boss: 'boss',
} as const;

export type EnemyType = (typeof EnemyType)[keyof typeof EnemyType];
