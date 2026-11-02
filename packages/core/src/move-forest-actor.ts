import { forestTrees } from './forest-trees.ts';
import { wrap } from '@emberfall/core/geometry';
import { FOREST } from './definitions/worlds/forest.ts';

// Forty pixels covers nearby trunks during actor movement's radius-sized substeps.
const TREE_COLLISION_QUERY_RADIUS = 40;

export function moveForestActor(
  position: { x: number; y: number },
  dx: number,
  dy: number,
  radius: number,
  collide = true,
) {
  if (!collide) {
    return { x: wrap(position.x + dx, FOREST.width), y: wrap(position.y + dy, FOREST.height) };
  }

  let { x, y } = position;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / Math.max(1, radius / 2)));

  for (let i = 0; i < steps; i++) {
    const trees = forestTrees(x, y, TREE_COLLISION_QUERY_RADIUS);
    const clear = (px: number, py: number) => {
      // Owner-position spawns must be able to escape a trunk they already overlap.
      return trees.every((t) => {
        return (
          Math.hypot(px - t.x, py - t.y) >=
          Math.min(radius + t.radius, Math.hypot(x - t.x, y - t.y))
        );
      });
    };

    if (clear(x + dx / steps, y)) {
      x += dx / steps;
    }

    if (clear(x, y + dy / steps)) {
      y += dy / steps;
    }
  }

  return { x: wrap(x, FOREST.width), y: wrap(y, FOREST.height) };
}
