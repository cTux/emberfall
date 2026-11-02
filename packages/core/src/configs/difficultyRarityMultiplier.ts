import type { Difficulty } from '@emberfall/core/enums';

// Higher difficulty improves gear quality independently of enemy strength and drop counts.
export const difficultyRarityMultiplier: Readonly<Record<Difficulty, number>> = Object.freeze({
  Easy: 1,
  Medium: 1.5,
  Hard: 2,
});
