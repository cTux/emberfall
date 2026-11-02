import { type createGame, game } from '../game.ts';
import type { Player, Enemy } from '@emberfall/common';
import { PLAYER_ATTACK_RANGE } from './constants.ts';

// A micro-pixel tolerance keeps mathematically tangent sword/body circles from missing due to roundoff.
import { enemyHitbox } from '../hitboxes.ts';
import { wrappedDelta } from '@emberfall/common';
import { FOREST } from '../scene.ts';

// A micro-pixel tolerance keeps mathematically tangent sword/body circles from missing due to roundoff.
const SWORD_CONTACT_EPSILON = 1e-6;

type Game = ReturnType<typeof createGame>;

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

  return distance <= body.radius + SWORD_CONTACT_EPSILON;
}
