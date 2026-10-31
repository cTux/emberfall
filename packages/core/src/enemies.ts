import { game, type createGame } from './game.ts';
import { AILMENT_DEFINITIONS } from './definitions/effects/ailments.ts';
import { wrap, wrappedDelta } from '@emberfall/common';
import { FOREST, forestDistance, forestTrees, moveForestActor } from './scene.ts';
import type { Enemy } from '@emberfall/common';

import { ENEMY_STATS, ENEMY_RULES } from './definitions/entities/enemies.ts';
import { Difficulty, EnemyKind, EnemyType } from '@emberfall/common/enums';
import { enemyAttributes } from './utils/enemyAttributes.ts';
export { ENEMY_STATS };
export function spawnArchetype(
  roll: number,
  count: number,
  context: ReturnType<typeof createGame> = game,
): NonNullable<Enemy['archetype']> {
  let threshold = 0;
  for (const rule of context.registries.spawnRules.values()) {
    threshold += rule.chance;
    if (roll < threshold) return rule.enemy;
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
) {
  const ENEMY_STATS = Object.fromEntries(context.registries.enemies.entries());
  const speedMultiplier = context.registries.difficulties.require(difficulty).speedMultiplier;
  const cells = new Map<number, Set<Enemy>>();
  const key = (x: number, y: number) =>
    wrap(Math.floor(x / 40), 120) + wrap(Math.floor(y / 40), 64) * 120;
  for (const enemy of enemies) {
    const cell = key(enemy.x, enemy.y);
    if (!cells.has(cell)) cells.set(cell, new Set());
    cells.get(cell)!.add(enemy);
  }

  for (const enemy of enemies) {
    if (enemy.attack || (enemy.controlledUntil ?? 0) > now) continue;
    const stats = ENEMY_STATS[enemy.archetype ?? 'skeleton'];
    const challenged =
      (enemy.challengedUntil ?? 0) > now
        ? players.find((player) => player.id === enemy.challengedBy && player.hitpoints > 0)
        : undefined;
    const target =
      challenged ??
      players
        .filter((p) => p.hitpoints > 0)
        .reduce<(typeof players)[number] | undefined>(
          (best, p) => (!best || forestDistance(p, enemy) < forestDistance(best, enemy) ? p : best),
          undefined,
        );
    if (!target) continue;
    const targetDistance = forestDistance(enemy, target);
    if (stats.behavior === 'ranged' && targetDistance < ENEMY_RULES.casterStopRange) continue;
    cells.get(key(enemy.x, enemy.y))!.delete(enemy);
    const rooted =
      enemy.kind !== 'boss' && enemy.debuffs?.some((d) => d.kind === 'roots' && d.expiresAt > now);
    const distance = Math.min(
      stats.speed *
        speedMultiplier *
        dt *
        (rooted ? 1 - (AILMENT_DEFINITIONS.roots.slowFraction ?? 0) : 1),
      targetDistance,
    );
    const steps = Math.max(1, Math.ceil(distance / 5));
    for (let step = 0; step < steps && distance > 0; step++) {
      const dx = wrappedDelta(target.x, enemy.x, FOREST.width);
      const dy = wrappedDelta(target.y, enemy.y, FOREST.height);
      const length = Math.max(1, Math.hypot(dx, dy));
      let angle = Math.atan2(dy, dx);
      // The forest has isolated circular trunks. Steer around the first trunk on the route.
      // Keep the side deterministic so successive ticks don't alternate left and right.
      const side = enemy.id % 2 ? 1 : -1;
      const blocker = forestTrees(enemy.x, enemy.y + 15, 140)
        .map((tree) => {
          const x = tree.x - enemy.x,
            y = tree.y - enemy.y - 15;

          return {
            x,
            y,
            ahead: (x * dx + y * dy) / length,
            across: Math.abs(x * dy - y * dx) / length,
          };
        })
        .filter(
          (t) => t.ahead > 0 && t.ahead < Math.min(length, 120) && t.across < stats.radius + 21,
        )
        .sort((a, b) => a.ahead - b.ahead)[0];
      if (blocker)
        angle =
          Math.atan2(blocker.y, blocker.x) +
          side *
            (Math.asin(Math.min(1, (stats.radius + 21) / Math.hypot(blocker.x, blocker.y))) + 0.1);
      const stride = distance / steps;
      for (const offset of [
        0,
        (side * Math.PI) / 6,
        (-side * Math.PI) / 6,
        (side * Math.PI) / 3,
        (-side * Math.PI) / 3,
        (side * Math.PI) / 2,
        (-side * Math.PI) / 2,
      ]) {
        const heading = angle + offset;
        const next = moveForestActor(
          { x: enemy.x, y: enemy.y + 15 },
          Math.cos(heading) * stride,
          Math.sin(heading) * stride,
          stats.radius,
        );
        const point = { x: next.x, y: wrap(next.y - 15, FOREST.height) };
        if (forestDistance(point, enemy) < stride * 0.9) continue;
        let clear = true;
        for (let row = -1; row <= 1; row++)
          for (let col = -1; col <= 1; col++) {
            for (const other of cells.get(key(point.x + col * 40, point.y + row * 40)) ?? []) {
              if (
                forestDistance(point, other) <
                stats.radius + ENEMY_STATS[other.archetype ?? 'skeleton'].radius
              )
                clear = false;
            }
          }

        if (!clear) continue;
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
    if (!cells.has(cell)) cells.set(cell, new Set());
    cells.get(cell)!.add(enemy);
  }
}
