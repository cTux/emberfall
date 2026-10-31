import { game } from '../game.ts';
export const enemyTypeAttributesMultiplier = Object.freeze(
  Object.fromEntries(
    game.registries.enemyTypes.values().map((type) => {
      return [type.id, type.multiplier];
    }),
  ),
);
