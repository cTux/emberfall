// One billion HP and a one-second refresh keep practice targets reusable without awarding rewards.
// Three rows at 40-unit spacing preserve the existing triangular practice formation.
export const TRAINING_DEFINITION = {
  id: 'training',
  dummyName: 'Training dummy',
  hitpoints: 1000000000,
  refreshMs: 1000,
  triangleRows: 3,
  spacing: 40,
  rewards: false,
} as const;
