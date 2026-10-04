import { ENEMY_STATS } from "./definitions/entities/enemies.ts";
import { COLLISION } from "./definitions/collision.ts";
import { forestDistance } from "./scene.ts";
import type { Enemy } from "./scene.ts";

/** Center and radius of the rendered actor model, excluding weapons and effects. */
export function modelHitbox(actor: { x: number; y: number }, size = 48) {
  return { x: actor.x, y: actor.y + COLLISION.feetOffset - (size * 7) / 16, radius: size / 2 };
}

export function enemyHitbox(enemy: Enemy) {
  return modelHitbox(enemy, ENEMY_STATS[enemy.archetype ?? "skeleton"].size);
}

export function overlapsBody(
  point: { x: number; y: number },
  radius: number,
  body: { x: number; y: number; radius: number },
) {
  return forestDistance(point, body) <= radius + body.radius;
}
