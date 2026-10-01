import {
  FOREST,
  forestDistance,
  forestTrees,
  moveForestActor,
  wrap,
  wrappedDelta,
} from "./scene.ts";
import type { Enemy } from "./scene.ts";
import type { Player } from "./index.ts";

export const ENEMY_HP = { normal: 10, elite: 50, boss: 200 } as const;
export const ENEMY_STATS = {
  skeleton: { speed: 64, radius: 10, size: 48, reach: 40, windup: 650, cooldown: 1000 },
  runner: { speed: 104, radius: 8, size: 32, reach: 32, windup: 500, cooldown: 900 },
  brute: { speed: 40, radius: 16, size: 68, reach: 65, windup: 1000, cooldown: 1600 },
  caster: { speed: 54, radius: 10, size: 44, reach: 260, windup: 900, cooldown: 1600 },
} as const;

export function spawnArchetype(roll: number, count: number): NonNullable<Enemy["archetype"]> {
  return roll < 0.1 ? "brute" : roll < 0.2 ? "caster" : count % 2 ? "skeleton" : "runner";
}
export function enemyMaxHealth(enemy: Pick<Enemy, "kind" | "archetype" | "maxHitpoints">) {
  return (
    enemy.maxHitpoints ??
    ENEMY_HP[enemy.kind ?? "normal"] *
      (enemy.kind === "boss"
        ? 1
        : enemy.archetype === "brute"
          ? 3
          : enemy.archetype === "caster"
            ? 0.7
            : 1)
  );
}

/** Local tree detours and solid crowd bodies, used by the authoritative server. */
export function moveEnemies(enemies: Enemy[], players: Player[], dt: number) {
  const cells = new Map<number, Set<Enemy>>();
  const key = (x: number, y: number) =>
    wrap(Math.floor(x / 40), 120) + wrap(Math.floor(y / 40), 64) * 120;
  for (const enemy of enemies) {
    const cell = key(enemy.x, enemy.y);
    if (!cells.has(cell)) cells.set(cell, new Set());
    cells.get(cell)!.add(enemy);
  }
  for (const enemy of enemies) {
    if (enemy.attack) continue;
    const stats = ENEMY_STATS[enemy.archetype ?? "skeleton"];
    const target = players
      .filter((p) => p.hitpoints > 0)
      .reduce<Player | undefined>(
        (best, p) => (!best || forestDistance(p, enemy) < forestDistance(best, enemy) ? p : best),
        undefined,
      );
    if (!target) continue;
    const targetDistance = forestDistance(enemy, target);
    if (enemy.archetype === "caster" && targetDistance < 210) continue;
    cells.get(key(enemy.x, enemy.y))!.delete(enemy);
    const distance = Math.min(stats.speed * dt, targetDistance);
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
                stats.radius + ENEMY_STATS[other.archetype ?? "skeleton"].radius
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
