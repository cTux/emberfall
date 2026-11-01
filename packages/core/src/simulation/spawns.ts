import { dimensionDefinition } from '../dimensions.ts';
import { COLLISION } from '../definitions/collision.ts';

import { game, type createGame } from '../game.ts';
import { TRANSIENT_EFFECTS } from '../definitions/effects/transient.ts';
import { ENEMY_RULES } from '../definitions/entities/enemies.ts';
import { FOREST_ENCOUNTER } from '../definitions/encounters/forest.ts';
import { appendSceneEntities, wrap } from '@emberfall/common';
import { FOREST, forestDistance, forestTrees } from '../scene.ts';
import { spawnArchetype, enemyMaxHealth } from '../enemies.ts';
import type { Player, SceneState } from '@emberfall/common';
import { EnemyType } from '@emberfall/common/enums';
import { spawnEnemyType } from '../utils/spawnEnemyType.ts';
import type { EnemyDefinition } from '../content/contracts.ts';

// Existing spawn clearances keep emerging bodies off trunks and separate their warning silhouettes.
const SPAWN_CLEARANCE = { treeQueryRadius: 40, treeRadius: 31, otherEnemy: 32 } as const;

type Game = ReturnType<typeof createGame>;
export function tickSpawns(
  scene: SceneState,
  alive: Player[],
  now: number,
  healthScale: number,
  ENEMY_STATS: Readonly<Record<string, Readonly<EnemyDefinition>>>,
  context: Game = game,
) {
  scene.spawns ??= [];
  const dimension = dimensionDefinition(scene.dimension, context);
  const boss = context.registries.bosses.require(dimension.boss);
  const spawnBoss = now >= scene.endsAt! && scene.bossId === undefined;
  scene.damage = scene.damage.filter((d) => {
    return now - d.at < TRANSIENT_EFFECTS.damage.lifetimeMs;
  });

  if (
    alive.length &&
    (spawnBoss ||
      (now >= scene.nextSpawn &&
        scene.enemies.length + scene.spawns.length <
          ENEMY_RULES.maxAlive - (scene.bossId === undefined ? 1 : 0)))
  ) {
    scene.nextSpawn = now + FOREST_ENCOUNTER.spawnIntervalMs;
    const target = alive[scene.sequence % alive.length];

    // Reserve one slot for the boss. Search additional clear positions only for this mandatory spawn.
    for (
      let attempt = 0;
      attempt < (spawnBoss ? FOREST_ENCOUNTER.bossPlacementAttempts : 1);
      attempt++
    ) {
      const angle = (scene.sequence + attempt) * FOREST_ENCOUNTER.spawnAngleStep;
      const radius =
        FOREST_ENCOUNTER.spawnRadius +
        Math.floor(attempt / FOREST_ENCOUNTER.spawnRingAttempts) *
          FOREST_ENCOUNTER.spawnRingSpacing;
      const position = {
        x: wrap(target.x + Math.cos(angle) * radius, FOREST.width),
        y: wrap(target.y + Math.sin(angle) * radius, FOREST.height),
      };
      const clear =
        forestTrees(
          position.x,
          position.y + COLLISION.feetOffset,
          SPAWN_CLEARANCE.treeQueryRadius,
        ).every((t) => {
          return (
            Math.hypot(position.x - t.x, position.y + COLLISION.feetOffset - t.y) >=
            SPAWN_CLEARANCE.treeRadius
          );
        }) &&
        [...scene.enemies, ...scene.spawns].every((e) => {
          return forestDistance(e, position) >= SPAWN_CLEARANCE.otherEnemy;
        });

      if (!clear) {
        continue;
      }

      scene.spawnCount = (scene.spawnCount ?? 0) + 1;
      const kind = spawnBoss ? EnemyType.Boss : spawnEnemyType(context.random);
      const id = ++scene.sequence;
      const archetype = spawnBoss
        ? boss.archetype
        : spawnArchetype(context.random(), scene.spawnCount, context, dimension.id);
      const hitpoints =
        enemyMaxHealth({ kind, archetype }, scene.difficulty, context) *
        healthScale *
        dimension.enemyMultiplier;
      appendSceneEntities(scene, 'spawns', {
        id,
        ...position,
        hitpoints,
        maxHitpoints: hitpoints,
        kind,
        name: spawnBoss ? boss.name : undefined,
        archetype,
        angle: 0,
        warnedAt: now,
        spawnsAt: now + ENEMY_RULES.spawnWarningMs,
      });

      if (spawnBoss) {
        scene.bossId = id;
      }

      break;
    }

    // Vary the next attempt even when a normal spawn was blocked.
    scene.sequence++;
  }

  scene.spawns = scene.spawns.filter((spawn) => {
    if (now < spawn.spawnsAt) {
      return true;
    }

    if (
      scene.enemies.some((e) => {
        return (
          forestDistance(e, spawn) <
          ENEMY_STATS[e.archetype ?? 'skeleton'].radius +
            ENEMY_STATS[spawn.archetype ?? 'skeleton'].radius
        );
      })
    ) {
      spawn.spawnsAt = now + FOREST_ENCOUNTER.blockedSpawnRetryMs;

      return true;
    }

    const { spawnsAt: _at, warnedAt: _warned, ...enemy } = spawn;
    appendSceneEntities(scene, 'enemies', enemy);

    return false;
  });
}
