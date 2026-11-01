import { dimensionDefinition } from './dimensions.ts';
import { COLLISION } from './definitions/collision.ts';

import { game, type createGame } from './game.ts';
import { AILMENT_DEFINITIONS } from './definitions/effects/ailments.ts';
import { wrap, wrappedDelta } from '@emberfall/common';
import { FOREST, forestDistance, forestTrees, moveForestActor } from './scene.ts';
import type { Enemy } from '@emberfall/common';

import { ENEMY_STATS, ENEMY_RULES } from './definitions/entities/enemies.ts';
import { Difficulty, EnemyKind, EnemyType } from '@emberfall/common/enums';
import { enemyAttributes } from './utils/enemyAttributes.ts';

// Existing forty-pixel spatial bins cover neighboring crowd bodies without scanning every enemy.
// The 120-by-64 key grid preserves the established wrapping/hash behavior.
const CROWD_GRID = { cellSize: 40, columns: 120, rows: 64 } as const;
// Five-pixel movement substeps prevent enemies from tunneling through narrow obstacles.
const ENEMY_STEP_PIXELS = 5;
// Existing tree lookahead and clearance keep enemies turning before reaching a trunk.
const TREE_DETOUR = { queryRadius: 140, lookahead: 120, clearance: 21, angleMargin: 0.1 } as const;
// Try thirty-, sixty- and ninety-degree alternatives in deterministic left/right order.
const DETOUR_ANGLES = {
  shallow: Math.PI / 6,
  diagonal: Math.PI / 3,
  perpendicular: Math.PI / 2,
} as const;
// Reject a detour that loses more than ten percent of its intended stride to collision.
const MINIMUM_STRIDE_FRACTION = 0.9;
export { ENEMY_STATS };
export function spawnArchetype(
  roll: number,
  count: number,
  context: ReturnType<typeof createGame> = game,
  dimension: import('@emberfall/common').DimensionId = 'forest',
): NonNullable<Enemy['archetype']> {
  let threshold = 0;

  for (const rule of context.registries.spawnRules.values()) {
    if ((rule.dimension ?? 'forest') !== dimension) {
      continue;
    }

    threshold += rule.chance;

    if (roll < threshold) {
      return rule.enemy;
    }
  }

  if (dimension !== 'forest') {
    const enemies = dimensionDefinition(dimension, context).enemies;

    return enemies[count % enemies.length];
  }

  const fallbacks = context.registries.settings.require('spawnFallbacks')
    .value as readonly string[];

  return fallbacks[count % fallbacks.length];
}

export function enemyMaxHealth(
  enemy: Pick<Enemy, 'kind' | 'archetype' | 'maxHitpoints'>,
  difficulty: Difficulty = Difficulty.Easy,
  context: ReturnType<typeof createGame> = game,
) {
  return (
    enemy.maxHitpoints ??
    enemyAttributes(
      enemy.archetype ?? EnemyKind.Skeleton,
      enemy.kind ?? EnemyType.Normal,
      difficulty,
      context,
    ).hitPoints
  );
}

/** Local tree detours and solid crowd bodies, used by the authoritative server. */
export function moveEnemies(
  enemies: Enemy[],
  players: { id?: string; x: number; y: number; hitpoints: number }[],
  dt: number,
  now = 0,
  context: ReturnType<typeof createGame> = game,
  difficulty: Difficulty = Difficulty.Easy,
  dimension?: import('@emberfall/common').DimensionId,
) {
  const ENEMY_STATS = Object.fromEntries(context.registries.enemies.entries());
  const dimensionScale = dimensionDefinition(dimension, context).enemyMultiplier;
  const speedMultiplier =
    context.registries.difficulties.require(difficulty).speedMultiplier * dimensionScale;
  const cells = new Map<number, Set<Enemy>>();
  const key = (x: number, y: number) => {
    return (
      wrap(Math.floor(x / CROWD_GRID.cellSize), CROWD_GRID.columns) +
      wrap(Math.floor(y / CROWD_GRID.cellSize), CROWD_GRID.rows) * CROWD_GRID.columns
    );
  };

  for (const enemy of enemies) {
    const cell = key(enemy.x, enemy.y);

    if (!cells.has(cell)) {
      cells.set(cell, new Set());
    }

    cells.get(cell)!.add(enemy);
  }

  for (const enemy of enemies) {
    if (enemy.attack || (enemy.controlledUntil ?? 0) > now) {
      continue;
    }

    const stats = ENEMY_STATS[enemy.archetype ?? 'skeleton'];
    const challenged =
      (enemy.challengedUntil ?? 0) > now
        ? players.find((player) => {
            return player.id === enemy.challengedBy && player.hitpoints > 0;
          })
        : undefined;
    const target =
      challenged ??
      players
        .filter((p) => {
          return p.hitpoints > 0;
        })
        .reduce<(typeof players)[number] | undefined>((best, p) => {
          return !best || forestDistance(p, enemy) < forestDistance(best, enemy) ? p : best;
        }, undefined);

    if (!target) {
      continue;
    }

    const targetDistance = forestDistance(enemy, target);

    if (
      stats.behavior === 'ranged' &&
      targetDistance < Math.min(ENEMY_RULES.casterStopRange, stats.reach) * dimensionScale
    ) {
      continue;
    }

    cells.get(key(enemy.x, enemy.y))!.delete(enemy);
    const rooted =
      enemy.kind !== 'boss' &&
      enemy.debuffs?.some((d) => {
        return d.kind === 'roots' && d.expiresAt > now;
      });
    const distance = Math.min(
      stats.speed *
        speedMultiplier *
        dt *
        (rooted ? 1 - (AILMENT_DEFINITIONS.roots.slowFraction ?? 0) : 1),
      targetDistance,
    );
    const steps = Math.max(1, Math.ceil(distance / ENEMY_STEP_PIXELS));

    for (let step = 0; step < steps && distance > 0; step++) {
      const dx = wrappedDelta(target.x, enemy.x, FOREST.width);
      const dy = wrappedDelta(target.y, enemy.y, FOREST.height);
      const length = Math.max(1, Math.hypot(dx, dy));
      let angle = Math.atan2(dy, dx);
      // The forest has isolated circular trunks. Steer around the first trunk on the route.
      // Keep the side deterministic so successive ticks don't alternate left and right.
      const side = enemy.id % 2 ? 1 : -1;
      const blocker = forestTrees(enemy.x, enemy.y + COLLISION.feetOffset, TREE_DETOUR.queryRadius)
        .map((tree) => {
          const x = tree.x - enemy.x,
            y = tree.y - enemy.y - COLLISION.feetOffset;

          return {
            x,
            y,
            ahead: (x * dx + y * dy) / length,
            across: Math.abs(x * dy - y * dx) / length,
          };
        })
        .filter((t) => {
          return (
            t.ahead > 0 &&
            t.ahead < Math.min(length, TREE_DETOUR.lookahead) &&
            t.across < stats.radius + TREE_DETOUR.clearance
          );
        })
        .sort((a, b) => {
          return a.ahead - b.ahead;
        })[0];

      if (blocker) {
        angle =
          Math.atan2(blocker.y, blocker.x) +
          side *
            (Math.asin(
              Math.min(
                1,
                (stats.radius + TREE_DETOUR.clearance) / Math.hypot(blocker.x, blocker.y),
              ),
            ) +
              TREE_DETOUR.angleMargin);
      }

      const stride = distance / steps;

      for (const offset of [
        0,
        side * DETOUR_ANGLES.shallow,
        -side * DETOUR_ANGLES.shallow,
        side * DETOUR_ANGLES.diagonal,
        -side * DETOUR_ANGLES.diagonal,
        side * DETOUR_ANGLES.perpendicular,
        -side * DETOUR_ANGLES.perpendicular,
      ]) {
        const heading = angle + offset;
        const next = moveForestActor(
          { x: enemy.x, y: enemy.y + COLLISION.feetOffset },
          Math.cos(heading) * stride,
          Math.sin(heading) * stride,
          stats.radius,
        );
        const point = { x: next.x, y: wrap(next.y - COLLISION.feetOffset, FOREST.height) };

        if (forestDistance(point, enemy) < stride * MINIMUM_STRIDE_FRACTION) {
          continue;
        }

        let clear = true;

        for (let row = -1; row <= 1; row++) {
          for (let col = -1; col <= 1; col++) {
            for (const other of cells.get(
              key(point.x + col * CROWD_GRID.cellSize, point.y + row * CROWD_GRID.cellSize),
            ) ?? []) {
              if (
                forestDistance(point, other) <
                stats.radius + ENEMY_STATS[other.archetype ?? 'skeleton'].radius
              ) {
                clear = false;
              }
            }
          }
        }

        if (!clear) {
          continue;
        }

        enemy.angle = Math.atan2(
          wrappedDelta(point.y, enemy.y, FOREST.height),
          wrappedDelta(point.x, enemy.x, FOREST.width),
        );
        enemy.x = point.x;
        enemy.y = point.y;
        break;
      }
    }

    const cell = key(enemy.x, enemy.y);

    if (!cells.has(cell)) {
      cells.set(cell, new Set());
    }

    cells.get(cell)!.add(enemy);
  }
}
