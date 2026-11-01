import { game, type createGame } from './game.ts';
import { COLLISION } from './definitions/collision.ts';
import { forestDistance } from './scene.ts';
import type { Enemy } from '@emberfall/common';

// Existing fallback matches the forty-eight-pixel actor art when a caller omits its size.
const DEFAULT_MODEL_SIZE = 48;
// Seven sixteenths places the model center above its feet while retaining a half-size radius.
const MODEL_CENTER_OFFSET = { numerator: 7, denominator: 16 } as const;

/** Center and radius of the rendered actor model, excluding weapons and effects. */
export function modelHitbox(
  actor: { x: number; y: number; size?: number },
  size = actor.size ?? DEFAULT_MODEL_SIZE,
) {
  return {
    x: actor.x,
    y:
      actor.y +
      COLLISION.feetOffset -
      (size * MODEL_CENTER_OFFSET.numerator) / MODEL_CENTER_OFFSET.denominator,
    radius: size / 2,
  };
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
