import { game } from '../game.ts';
export const itemCountDropPercent = Object.freeze(
  Object.fromEntries(game.registries.enemyTypes.values().map((type) => [type.id, type.dropCount])),
);
