import type { CastRequest } from './cast-request.ts';
import type { Game } from './game.ts';
import { castInputs } from './cast-inputs.ts';
import type { SceneState, Player } from '@emberfall/core/contracts';
import { game } from '../game.ts';
import { inTrainingZone } from '../world.ts';
import { TICK_MS } from './constants.ts';

// Buffer two simulation ticks of early requests to tolerate normal command/tick phase differences.
const CAST_BUFFER_TICKS = 2;

/** Buffer slightly early requests for their due time; client IDs never bypass server cooldowns. */
export function requestPlayerCast(
  scene: SceneState | undefined,
  player: Player,
  request: CastRequest,
  now: number,
  context: Game = game,
) {
  if (request.id <= (player.castSeq ?? 0)) {
    return false;
  }

  player.castSeq = request.id;
  const stats = context.rules.characterStats(player);

  if (
    !scene ||
    !stats.hasWeapon ||
    !Number.isFinite(stats.attackIntervalMs) ||
    scene.phase !== 'active' ||
    scene.pausedAt !== undefined ||
    player.hitpoints <= 0 ||
    request.classId !== (player.classId ?? 'warrior') ||
    request.epoch !== (player.scene === 'forest' ? scene.id : 'lobby') ||
    (!player.scene && !inTrainingZone(player)) ||
    (player.attackAt !== undefined &&
      now - player.attackAt < stats.attackIntervalMs - CAST_BUFFER_TICKS * TICK_MS)
  ) {
    return false;
  }

  player.autoAttack = false;
  player.autoTarget = request.autoTarget;
  player.aimX = request.aimX;
  player.aimY = request.aimY;
  player.attackAt = Math.max(now, (player.attackAt ?? -Infinity) + stats.attackIntervalMs);
  player.attackId = request.id;
  castInputs.set(player, request);

  return true;
}
