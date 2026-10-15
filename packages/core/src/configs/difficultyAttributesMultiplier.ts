import { Difficulty } from '@emberfall/common/enums';

export const difficultyAttributesMultiplier = {
  [Difficulty.Easy]: 1,
  [Difficulty.Medium]: 2,
  [Difficulty.Hard]: 4,
} as const satisfies Record<Difficulty, number>;
