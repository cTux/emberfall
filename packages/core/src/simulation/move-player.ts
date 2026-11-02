import type { Player } from '@emberfall/core/contracts';
import { ARENA, moveActor } from '../world.ts';
import { game } from '../game.ts';
import { PERCENT } from '@emberfall/core/contracts';
import { wrap } from '@emberfall/core/geometry';
import { moveForestActor, FOREST } from '../scene.ts';
import { COLLISION } from '../definitions/collision.ts';
import { PLAYER_BODY_RADIUS } from '../definitions/entities/players.ts';

export function movePlayer(player: Player, x: number, y: number, dt: number) {
  if (player.hitpoints <= 0) {
    return;
  }

  const length = Math.max(1, Math.hypot(x, y));
  const speed =
    ARENA.speed * (1 + game.rules.characterStats(player).bonuses.movementSpeed / PERCENT);
  const next = (player.scene === 'forest' ? moveForestActor : moveActor)(
    { x: player.x, y: player.y + COLLISION.feetOffset },
    (x / length) * speed * dt,
    (y / length) * speed * dt,
    PLAYER_BODY_RADIUS,
    false,
  );
  player.x = next.x;
  player.y = wrap(
    next.y - COLLISION.feetOffset,
    player.scene === 'forest' ? FOREST.height : ARENA.height,
  );
}
