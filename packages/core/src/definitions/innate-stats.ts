import { game } from '../game.ts';

export const INNATE_STATS = Object.freeze(
  Object.fromEntries(
    game.registries.stats.values().map((stat) => {
      return [stat.id, stat.default];
    }),
  ),
);
