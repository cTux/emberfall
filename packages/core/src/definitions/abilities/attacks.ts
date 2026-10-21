import { game } from '../../game.ts';
export const ATTACK_DEFINITIONS = Object.freeze(
  Object.fromEntries(game.registries.abilities.entries()),
);
