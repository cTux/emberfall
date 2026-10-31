import { game } from '../game.ts';
export const itemDropChance = Object.freeze(
  Object.fromEntries(
    game.registries.enemyTypes.values().map((type) => {
      return [type.id, type.dropChance];
    }),
  ),
);
