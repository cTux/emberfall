import { game } from '../../game.ts';

export const CLASS_LABELS = Object.freeze(
  Object.fromEntries(
    game.registries.classes.values().map((player) => {
      return [player.id, player.label];
    }),
  ),
);
