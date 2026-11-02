import { TREES } from './trees-definition.ts';
import { wrap, wrappedDelta } from '@emberfall/core/geometry';
import { ARENA, WARDROBE, TORCHES, BUILDINGS } from './definitions/worlds/village.ts';
import { VILLAGE_TREE, VILLAGE_OBSTACLES } from './village-layout.ts';

/** Circle-body movement for players and enemies; coordinates are at their feet. */
export function moveActor(
  position: { x: number; y: number },
  dx: number,
  dy: number,
  radius: number,
  collide = true,
  collideScenery = true,
) {
  if (!collide) {
    return {
      x: wrap(position.x + dx, ARENA.width),
      y: wrap(position.y + dy, ARENA.height),
    };
  }

  let { x, y } = position;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / Math.max(1, radius / 2)));
  // ponytail: scan this small fixed grove; index obstacles spatially when maps grow.
  const clear = (px: number, py: number) => {
    // Owner-position spawns must be able to escape a trunk they already overlap.
    return (
      TREES.every((tree) => {
        const distance = (tx: number, ty: number) => {
          return Math.hypot(
            wrappedDelta(tx, tree.x, ARENA.width),
            wrappedDelta(ty, tree.y - VILLAGE_TREE.trunkOffsetY, ARENA.height),
          );
        };

        return distance(px, py) >= Math.min(radius + tree.radius, distance(x, y));
      }) &&
      (!collideScenery ||
        (Math.hypot(px - WARDROBE.x, py - WARDROBE.y) >=
          radius + VILLAGE_OBSTACLES.wardrobeRadius &&
          TORCHES.every((t) => {
            return Math.hypot(px - t.x, py - t.y) >= radius + VILLAGE_OBSTACLES.torchRadius;
          }) &&
          BUILDINGS.every((b) => {
            return (
              Math.hypot(
                px -
                  Math.max(
                    b.x - b.sourceWidth + VILLAGE_OBSTACLES.buildingInset,
                    Math.min(b.x + b.sourceWidth - VILLAGE_OBSTACLES.buildingInset, px),
                  ),
                py - Math.max(b.y - VILLAGE_OBSTACLES.buildingDepth, Math.min(b.y, py)),
              ) >= radius
            );
          })))
    );
  };

  for (let i = 0; i < steps; i++) {
    const nextX = wrap(x + dx / steps, ARENA.width);

    if (clear(nextX, y)) {
      x = nextX;
    }

    const nextY = wrap(y + dy / steps, ARENA.height);

    if (clear(x, nextY)) {
      y = nextY;
    }
  }

  return { x, y };
}
