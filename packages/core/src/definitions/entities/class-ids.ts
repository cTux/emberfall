import { game } from '../../game.ts';

export const CLASS_IDS = Object.freeze(
  game.registries.classes.values().map((player) => {
    return player.id;
  }),
);
