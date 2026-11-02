import { game } from '../game.ts';

export const CLASS_GEAR_TYPES = Object.freeze(
  Object.fromEntries(
    game.registries.classes.values().map((player) => {
      return [player.id, player.gearTypes];
    }),
  ),
);
