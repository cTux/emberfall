import { game } from '../game.ts';
export const difficultySpeedMultiplier = Object.freeze(
  Object.fromEntries(
    game.registries.difficulties.values().map((difficulty) => {
      return [difficulty.id, difficulty.speedMultiplier];
    }),
  ),
);
