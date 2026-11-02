import type { Enemy } from '@emberfall/core/contracts';
import { forestDistance, FOREST } from '../scene.ts';
import { wrappedDelta } from '@emberfall/core/geometry';

export function nearestEnemyAngle(
  player: { x: number; y: number },
  enemies: Enemy[],
  fallback = 0,
) {
  const closest = enemies
    .filter((e) => {
      return e.hitpoints > 0;
    })
    .reduce<Enemy | undefined>((best, enemy) => {
      return !best || forestDistance(enemy, player) < forestDistance(best, player) ? enemy : best;
    }, undefined);

  return closest
    ? Math.atan2(
        wrappedDelta(closest.y, player.y, FOREST.height),
        wrappedDelta(closest.x, player.x, FOREST.width),
      )
    : fallback;
}
