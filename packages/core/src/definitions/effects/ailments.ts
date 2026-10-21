import { game } from '../../game.ts';
export const AILMENT_DEFINITIONS = Object.freeze(
  Object.fromEntries(game.registries.ailments.entries()),
);
