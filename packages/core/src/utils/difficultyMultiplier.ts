import type { Difficulty } from '@emberfall/common/enums';
import { difficultyAttributesMultiplier } from '../configs/difficultyAttributesMultiplier.ts';

export const difficultyMultiplier = (difficulty: Difficulty) =>
  difficultyAttributesMultiplier[difficulty];
