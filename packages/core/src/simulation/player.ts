import { game, type createGame } from '../game.ts';
import { tickTalentEffects } from '../talent-effects.ts';
import { PLAYER_BODY_RADIUS } from '../definitions/entities/players.ts';
import { wrappedDelta, wrap } from '@emberfall/common';
import { FOREST, moveForestActor } from '../scene.ts';
import { ARENA, moveActor, inTrainingZone } from '../world.ts';
import { fireClassAttack, tickPlayerShots, nearestSpellTarget } from '../class-combat.ts';
import type { Player, ClientMessage, SceneState, Enemy } from '@emberfall/common';
import { TICK_MS } from './constants.ts';
import { smoothAttackAngle, nearestEnemyAngle } from './aim.ts';
import { swordHits, slash } from './melee.ts';

type Game = ReturnType<typeof createGame>;
type CastRequest = Extract<ClientMessage, { type: 'cast' }>;
const castInputs = new WeakMap<Player, CastRequest>();
export function movePlayer(player: Player, x: number, y: number, dt: number) {
  if (player.hitpoints <= 0) {
    return;
  }

  const length = Math.max(1, Math.hypot(x, y));
  const speed = ARENA.speed * (1 + game.rules.characterStats(player).bonuses.movementSpeed / 100);
  const next = (player.scene === 'forest' ? moveForestActor : moveActor)(
    { x: player.x, y: player.y + 15 },
    (x / length) * speed * dt,
    (y / length) * speed * dt,
    PLAYER_BODY_RADIUS,
    false,
  );
  player.x = next.x;
  player.y = wrap(next.y - 15, player.scene === 'forest' ? FOREST.height : ARENA.height);
}

export function playerAimAngle(player: Player, enemies: Enemy[], context: Game = game) {
  const target = nearestSpellTarget(player, enemies, context.rules.characterStats(player).range);

  return player.autoTarget === false && player.aimX !== undefined && player.aimY !== undefined
    ? Math.atan2(
        wrappedDelta(player.aimY, player.y, FOREST.height),
        wrappedDelta(player.aimX, player.x, FOREST.width),
      )
    : target
      ? nearestEnemyAngle(player, [target], player.attackAngle)
      : (player.attackAngle ?? 0);
}

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
    (player.attackAt !== undefined && now - player.attackAt < stats.attackIntervalMs - 2 * TICK_MS)
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

export function tickPlayerCombat(
  scene: SceneState,
  alive: Player[],
  now: number,
  dt: number,
  context: Game = game,
) {
  tickTalentEffects(scene, alive, now);

  for (const player of alive) {
    const stats = context.rules.characterStats(player);
    player.attackTargetId =
      player.autoTarget === false
        ? undefined
        : nearestSpellTarget(player, scene.enemies, stats.range)?.id;
    const ability = context.registries.abilities.require(
      context.registries.classes.require(player.classId ?? 'warrior').attack,
    );

    if (
      !stats.hasWeapon ||
      !Number.isFinite(stats.attackIntervalMs) ||
      (scene.training && !inTrainingZone(player))
    ) {
      player.attackAt = undefined;
      continue;
    }

    player.attackAngle = smoothAttackAngle(
      player.attackAngle,
      playerAimAngle(player, scene.enemies, context),
      dt,
      ability.aimSmoothingSeconds,
    );
    const attacking = player.autoAttack !== false;

    if (
      attacking &&
      (ability.kind === 'slash' ||
        player.autoTarget === false ||
        nearestSpellTarget(player, scene.enemies, stats.range)) &&
      (player.attackAt === undefined || now - player.attackAt >= stats.attackIntervalMs)
    ) {
      player.attackAt =
        ability.kind === 'slash'
          ? now - ((now - (player.attackAt ?? now)) % stats.attackIntervalMs)
          : now;
      player.attackId = undefined;
    }

    if (player.attackAt === undefined) {
      continue;
    }

    const age = now - player.attackAt;

    if (age < 0 || age >= ability.durationMs) {
      continue;
    }

    let swing = swordHits.get(player);
    const freshSwing = !swing || swing.at !== player.attackAt || swing.sceneId !== scene.id;

    if (freshSwing) {
      swing = { sceneId: scene.id, at: player.attackAt, enemies: new Set() };
      swordHits.set(player, swing);
    }

    if (ability.kind !== 'slash') {
      if (freshSwing) {
        const request = castInputs.get(player);
        fireClassAttack(
          scene,
          request && request.id === player.attackId
            ? {
                ...player,
                autoTarget: request.autoTarget,
                aimX: request.aimX,
                aimY: request.aimY,
              }
            : player,
          now,
          context,
        );
        castInputs.delete(player);
      }

      continue;
    }

    slash(scene, player, player, now, context);

    if (!scene.training) {
      scene.enemies = scene.enemies.filter((e) => {
        return e.hitpoints > 0;
      });
    }
  }

  tickPlayerShots(scene, alive, now, dt, context);

  if (!scene.training) {
    scene.enemies = scene.enemies.filter((e) => {
      return e.hitpoints > 0;
    });
  }
}
