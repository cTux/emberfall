import { game } from '../../game.ts';

export const PLAYER_DEFINITIONS = Object.freeze(
  Object.fromEntries(game.registries.classes.entries()),
);
