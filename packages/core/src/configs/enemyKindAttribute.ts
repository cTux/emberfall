import { game } from '../game.ts';
export const enemyKindAttribute = Object.freeze(
  Object.fromEntries(
    game.registries.enemies
      .values()
      .map((enemy) => [
        enemy.id,
        Object.freeze({ hitPoints: enemy.hitPoints, damage: enemy.damage }),
      ]),
  ),
);
