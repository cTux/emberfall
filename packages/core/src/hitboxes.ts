import { game, type createGame } from './game.ts';
import { COLLISION } from './definitions/collision.ts';
import { forestDistance } from './scene.ts';
import type { Enemy } from '@emberfall/common';

/** Center and radius of the rendered actor model, excluding weapons and effects. */
export function modelHitbox(
  actor: { x: number; y: number; size?: number },
  size = actor.size ?? 48,
) {
  return { x: actor.x, y: actor.y + COLLISION.feetOffset - (size * 7) / 16, radius: size / 2 };
}

export function enemyHitbox(enemy: Enemy, context: ReturnType<typeof createGame> = game) {
  return modelHitbox(enemy, context.registries.enemies.require(enemy.archetype ?? 'skeleton').size);
}

export function overlapsBody(
  point: { x: number; y: number },
  radius: number,
  body: { x: number; y: number; radius: number },
) {
  return forestDistance(point, body) <= radius + body.radius;
}
