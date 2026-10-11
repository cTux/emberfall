import {
  ARENA,
  WARDROBE,
  TRAINING_ZONES,
  BUILDINGS,
  TORCHES,
  PATH_CURVES,
  VILLAGE_DEFINITION,
} from "./definitions/worlds/village.ts";
export { ARENA, WARDROBE, TRAINING_ZONES, BUILDINGS, TORCHES };
import { wrap, wrappedDelta } from "./scene.ts";

export const inTrainingZone = (player: { x: number; y: number }) =>
  TRAINING_ZONES.some(
    (zone) =>
      Math.hypot(
        wrappedDelta(player.x, zone.x, ARENA.width) / zone.radius,
        wrappedDelta(player.y + 15, zone.y, ARENA.height) / (zone.radius * 0.85),
      ) <= 1,
  );

// Sample gentle Bezier bends once so drawing and vegetation clearance share the same route.
export const PATHS = PATH_CURVES.map(([start, bend1, bend2, end]) =>
  Array.from({ length: 33 }, (_, step) => {
    const t = step / 32,
      u = 1 - t;
    return {
      x: u ** 3 * start.x + 3 * u ** 2 * t * bend1.x + 3 * u * t ** 2 * bend2.x + t ** 3 * end.x,
      y: u ** 3 * start.y + 3 * u ** 2 * t * bend1.y + 3 * u * t ** 2 * bend2.y + t ** 3 * end.y,
    };
  }),
);
export function onPath(x: number, y: number, margin = 28) {
  if (Math.hypot((x - 480) / 110, (y - 355) / 75) < 1) return true;
  return PATHS.some((path) =>
    path.some((point, index) => {
      const next = path[index + 1];
      if (!next) return false;
      const dx = next.x - point.x,
        dy = next.y - point.y;
      const t = Math.max(
        0,
        Math.min(1, ((x - point.x) * dx + (y - point.y) * dy) / (dx * dx + dy * dy)),
      );
      return Math.hypot(x - point.x - t * dx, y - point.y - t * dy) < margin;
    }),
  );
}

export interface Tree {
  x: number;
  y: number;
  size: number;
  radius: number;
}
const trees: Tree[] = [];
let seed: number = VILLAGE_DEFINITION.treeSeed;
const random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
for (let i = 0; i < VILLAGE_DEFINITION.treeAttempts; i++) {
  const x = 35 + random() * (ARENA.width - 70);
  const y = 55 + random() * (ARENA.height - 85);
  if (TRAINING_ZONES.some((zone) => Math.hypot(x - zone.x, y - zone.y) < zone.clearingRadius + 35))
    continue;
  if (Math.hypot((x - 480) / 190, (y - 355) / 110) < 1 || onPath(x, y, 55)) continue;
  if (BUILDINGS.some((b) => Math.abs(x - b.x) < 100 && y > b.y - 130 && y < b.y + 65)) continue;
  if (TORCHES.some((t) => Math.hypot(t.x - x, t.y - y) < 45)) continue;
  if (trees.some((tree) => Math.hypot(tree.x - x, tree.y - y) < 48)) continue;
  trees.push({ x, y, size: 72 + Math.floor(random() * 25), radius: 15 });
}
export const TREES: readonly Readonly<Tree>[] = Object.freeze(
  trees.map((tree) => Object.freeze(tree)),
);

/** Circle-body movement for players and enemies; coordinates are at their feet. */
export function moveActor(
  position: { x: number; y: number },
  dx: number,
  dy: number,
  radius: number,
  collide = true,
  collideScenery = true,
) {
  if (!collide)
    return {
      x: wrap(position.x + dx, ARENA.width),
      y: wrap(position.y + dy, ARENA.height),
    };
  let { x, y } = position;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / Math.max(1, radius / 2)));
  // ponytail: scan this small fixed grove; index obstacles spatially when maps grow.
  const clear = (px: number, py: number) =>
    // Owner-position spawns must be able to escape a trunk they already overlap.
    TREES.every((tree) => {
      const distance = (tx: number, ty: number) =>
        Math.hypot(
          wrappedDelta(tx, tree.x, ARENA.width),
          wrappedDelta(ty, tree.y - 8, ARENA.height),
        );
      return distance(px, py) >= Math.min(radius + tree.radius, distance(x, y));
    }) &&
    (!collideScenery ||
      (Math.hypot(px - WARDROBE.x, py - WARDROBE.y) >= radius + 18 &&
        TORCHES.every((t) => Math.hypot(px - t.x, py - t.y) >= radius + 5) &&
        BUILDINGS.every(
          (b) =>
            Math.hypot(
              px - Math.max(b.x - b.sourceWidth + 8, Math.min(b.x + b.sourceWidth - 8, px)),
              py - Math.max(b.y - 40, Math.min(b.y, py)),
            ) >= radius,
        )));
  for (let i = 0; i < steps; i++) {
    const nextX = wrap(x + dx / steps, ARENA.width);
    if (clear(nextX, y)) x = nextX;
    const nextY = wrap(y + dy / steps, ARENA.height);
    if (clear(x, nextY)) y = nextY;
  }
  return { x, y };
}
