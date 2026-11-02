import { game } from '../../game.ts';

export const CRITTER_DEFINITIONS = Object.freeze(
  Object.fromEntries(game.registries.critters.entries()),
);
