import { game } from '../game.ts';
export const itemDropChance = Object.freeze(
  Object.fromEntries(game.registries.enemyTypes.values().map((type) => [type.id, type.dropChance])),
);
