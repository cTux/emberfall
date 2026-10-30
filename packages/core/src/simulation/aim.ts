import { game, type createGame } from '../game.ts';
import { enemyHitbox } from '../hitboxes.ts';
import { wrappedDelta } from '@emberfall/common';
import { FOREST, forestDistance } from '../scene.ts';
import { ATTACK_DEFINITIONS } from '../definitions/abilities/attacks.ts';
import type { Player, Enemy } from '@emberfall/common';
import { PLAYER_ATTACK_RANGE } from './constants.ts';

type Game = ReturnType<typeof createGame>;
/** Frame-rate independent aim smoothing, always taking the shortest turn across ±pi. */
export function smoothAttackAngle(
  current: number | undefined,
  target: number,
  dt: number,
  smoothingSeconds = ATTACK_DEFINITIONS.slash.aimSmoothingSeconds,
) {
  if (current === undefined) return target;
  const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  const angle = current + difference * (1 - Math.exp(-Math.max(0, dt) / smoothingSeconds));
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export function nearestEnemyAngle(
  player: { x: number; y: number },
  enemies: Enemy[],
  fallback = 0,
) {
  const closest = enemies
    .filter((e) => e.hitpoints > 0)
    .reduce<Enemy | undefined>(
      (best, enemy) =>
        !best || forestDistance(enemy, player) < forestDistance(best, player) ? enemy : best,
      undefined,
    );
  return closest
    ? Math.atan2(
        wrappedDelta(closest.y, player.y, FOREST.height),
        wrappedDelta(closest.x, player.x, FOREST.width),
      )
    : fallback;
}

export function swordOverlapsEnemy(
  player: Pick<Player, 'x' | 'y' | 'attackAngle'>,
  enemy: Enemy,
  range = PLAYER_ATTACK_RANGE,
  context: Game = game,
) {
  const body = enemyHitbox(enemy, context);
  const dx = wrappedDelta(body.x, player.x, FOREST.width),
    dy = wrappedDelta(body.y, player.y, FOREST.height);
  const angle = player.attackAngle ?? 0;
  const forward = dx * Math.cos(angle) + dy * Math.sin(angle);
  const sideways = -dx * Math.sin(angle) + dy * Math.cos(angle);
  // Distance from the enemy's collision circle to the filled forward half-disc.
  const distance =
    forward >= 0
      ? Math.max(0, Math.hypot(dx, dy) - range)
      : Math.hypot(forward, Math.max(0, Math.abs(sideways) - range));
  return distance <= body.radius + 1e-6;
}
