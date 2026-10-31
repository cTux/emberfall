import { game, type createGame } from '../game.ts';
import { DEFAULT_TACTICS, wrappedDelta, wrap } from '@emberfall/common';
import { talentNodeId, talentRank } from '../talent-tree.ts';
import { BEAR_DEFINITION } from '../definitions/entities/companions.ts';
import { FOREST, forestDistance } from '../scene.ts';
import { ARENA, moveActor } from '../world.ts';
import { ENEMY_STATS, moveEnemies } from '../enemies.ts';
import type { Player, SceneState, Enemy } from '@emberfall/common';
import { companionDecisions, decideCompanion } from './companion-decision.ts';
import { PLAYER_ATTACK_DURATION } from './constants.ts';
import { nearestEnemyAngle } from './aim.ts';
import { slash } from './melee.ts';

type Game = ReturnType<typeof createGame>;
export function tickCompanion(
  player: Player,
  scene: SceneState | undefined,
  now: number,
  dt: number,
  context: Game = game,
) {
  if (!context.registries.classes.require(player.classId ?? 'warrior').companion) {
    player.bear = undefined;

    return;
  }

  const bear = (player.bear ??= {
    id: `bear:${player.id}`,
    name: BEAR_DEFINITION.name,
    x: player.x,
    y: player.y,
    hitpoints: player.maxHitpoints * BEAR_DEFINITION.healthMultiplier,
    maxHitpoints: player.maxHitpoints * BEAR_DEFINITION.healthMultiplier,
    returning: false,
  });
  bear.moving = false;
  const stats = context.rules.companionStats(player);
  bear.range = stats.range;
  bear.size = talentRank(player, talentNodeId('druid', 1, 3)) > 0 ? 96 : 48;
  const max = stats.maxHitpoints;

  if (bear.hitpoints > 0) {
    bear.hitpoints = Math.min(max, bear.hitpoints + Math.max(0, max - bear.maxHitpoints));
  }

  bear.maxHitpoints = max;

  if (bear.hitpoints <= 0) {
    companionDecisions.delete(bear);
    bear.resurrectAt ??= now + BEAR_DEFINITION.resurrectionMs;

    if (now < bear.resurrectAt) {
      return;
    }

    bear.hitpoints = max;
    bear.x = player.x;
    bear.y = player.y;
    bear.resurrectAt = undefined;
    bear.hurtAt = undefined;
    bear.attackAt = undefined;
    bear.returning = false;
  }

  if (player.hitpoints <= 0) {
    return;
  }

  const forest = player.scene === 'forest';
  const tactics = player.tactics ?? DEFAULT_TACTICS;
  const preferredRadius = { close: 100, medium: 200, far: 300 }[tactics.distance];
  const huntRadius =
    tactics.stance === 'protect'
      ? Math.min(100, preferredRadius)
      : tactics.stance === 'aggressive'
        ? preferredRadius
        : Math.min(BEAR_DEFINITION.huntRadius, preferredRadius);
  const distance = forestDistance(bear, player);

  if (distance > BEAR_DEFINITION.teleportRadius) {
    bear.x = player.x;
    bear.y = player.y;
    bear.returning = false;
    bear.attackAt = undefined;
    companionDecisions.delete(bear);

    return;
  }

  if (distance > huntRadius) {
    bear.returning = true;
  }

  if (bear.returning && distance <= BEAR_DEFINITION.returnRadius) {
    bear.returning = false;
  }

  const decision = decideCompanion(bear, player, scene, now, huntRadius);
  const target =
    decision.target &&
    decision.target.hitpoints > 0 &&
    scene?.phase === 'active' &&
    scene.enemies.includes(decision.target) &&
    forestDistance(decision.target, player) <= huntRadius &&
    tactics.stance !== 'passive'
      ? decision.target
      : undefined;
  const destination =
    bear.returning || decision.following || (decision.target && !target)
      ? player
      : decision.destination;
  const heading = Math.atan2(
    wrappedDelta(destination.y, bear.y, FOREST.height),
    wrappedDelta(destination.x, bear.x, FOREST.width),
  );
  const startX = bear.x,
    startY = bear.y;
  const destinationDistance = forestDistance(bear, destination);

  if (destination !== player || destinationDistance > BEAR_DEFINITION.returnRadius) {
    const speed =
      ARENA.speed * (1 + context.rules.characterStats(player).bonuses.movementSpeed / 100);

    if (forest) {
      const body: Enemy = {
        id: 1,
        x: bear.x,
        y: bear.y,
        hitpoints: bear.hitpoints,
        angle: heading,
        archetype: 'runner',
      };
      moveEnemies([body], [destination], (dt * speed) / ENEMY_STATS.runner.speed, now);
      bear.x = body.x;
      bear.y = body.y;
    } else {
      const travel = Math.min(
        Math.max(
          0,
          destinationDistance - (destination === player ? BEAR_DEFINITION.returnRadius : 0),
        ),
        speed * Math.max(0, dt),
      );
      const next = moveActor(
        { x: bear.x, y: bear.y + 15 },
        Math.cos(heading) * travel,
        Math.sin(heading) * travel,
        12,
        true,
        false, // Follow through village fixtures, while retaining tree collision.
      );
      bear.x = next.x;
      bear.y = wrap(next.y - 15, ARENA.height);
    }
  }

  bear.moving = Math.hypot(bear.x - startX, bear.y - startY) > 0.001;

  if (bear.moving) {
    bear.attackAngle = heading;
  }

  if (target) {
    bear.attackAngle = nearestEnemyAngle(bear, [target], heading);
  }

  if (forestDistance(bear, player) > huntRadius && forest) {
    bear.returning = true;
  }

  if (!target || bear.returning || !scene) {
    bear.attackAt = undefined;

    return;
  }

  if (!stats.hasWeapon || !Number.isFinite(stats.attackIntervalMs)) {
    bear.attackAt = undefined;

    return;
  }

  if (bear.attackAt === undefined || now - bear.attackAt >= stats.attackIntervalMs) {
    bear.attackAt = now;
  }

  if (now - bear.attackAt < PLAYER_ATTACK_DURATION) {
    slash(scene, bear, player, now, context);
  }
}
