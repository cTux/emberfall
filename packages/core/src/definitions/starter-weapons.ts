import { game } from '../game.ts';

export const STARTER_WEAPONS = Object.freeze(
  Object.fromEntries(
    game.registries.classes.values().map((player) => {
      return [player.id, player.starterWeapon];
    }),
  ),
);
