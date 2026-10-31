import { game, type createGame } from '../game.ts';
type Game = ReturnType<typeof createGame>;
import { wrappedDelta, wrap } from '@emberfall/common';
import type { PlayerShot, Enemy } from '@emberfall/common';
import { FOREST, forestDistance } from '../scene.ts';
import { enemyHitbox, overlapsBody } from '../hitboxes.ts';
import { COLLISION } from '../definitions/collision.ts';

/** Shared projectile motion; the callback lets the server check piercing hits at each substep. */
export function advancePlayerShot(
  shot: PlayerShot,
  enemies: Enemy[],
  dt: number,
  onStep?: () => void,
  detectHits = true,
  context: Game = game,
) {
  let travelLimit = shot.remaining;
  if (shot.kind === 'roots' && shot.hitIds.length > 0) {
    const target = enemies.find((enemy) => enemy.id === shot.targetId && enemy.hitpoints > 0);
    if (!target) {
      shot.remaining = 0;

      return false;
    }

    const destination = enemyHitbox(target, context);
    shot.angle = Math.atan2(
      wrappedDelta(destination.y, shot.y, FOREST.height),
      wrappedDelta(destination.x, shot.x, FOREST.width),
    );
    shot.remaining = forestDistance(shot, destination) + 64;
    // Hold at the target while waiting for the next authoritative bounce.
    travelLimit = detectHits ? shot.remaining : forestDistance(shot, destination);
  }

  const distance = Math.min(
    travelLimit,
    Math.max(0, dt) * context.registries.abilities.require(shot.abilityId ?? shot.kind).speed,
  );
  const steps = Math.max(1, Math.ceil(distance / 6));
  for (let i = 0; i < steps; i++) {
    if (shot.remaining <= 0) break;
    shot.x = wrap(shot.x + (Math.cos(shot.angle) * distance) / steps, FOREST.width);
    shot.y = wrap(shot.y + (Math.sin(shot.angle) * distance) / steps, FOREST.height);
    shot.remaining -= distance / steps;
    onStep?.();
    if (detectHits && shot.kind !== 'arrow') {
      const hit = enemies.find(
        (enemy) =>
          enemy.hitpoints > 0 &&
          !shot.hitIds.includes(enemy.id) &&
          (shot.kind !== 'roots' || shot.hitIds.length === 0 || enemy.id === shot.targetId) &&
          overlapsBody(shot, COLLISION.playerProjectileRadius, enemyHitbox(enemy, context)),
      );
      if (hit) {
        shot.hitIds.push(hit.id);

        return true;
      }
    }
  }

  return false;
}
