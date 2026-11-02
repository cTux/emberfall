import { VILLAGE_DEFINITION, ARENA } from './definitions/worlds/village.ts';
import { SCENERY_RANDOM } from './scenery-seed.ts';
import type { Tree } from './tree.ts';
import { sceneryClearing } from './scenery-clearing.ts';
import { SCENERY_BOUNDS, SCENERY_CLEARANCE, VILLAGE_TREE } from './village-layout.ts';
let seed: number = VILLAGE_DEFINITION.treeSeed;
const random = () => {
  seed = (Math.imul(seed, SCENERY_RANDOM.multiplier) + SCENERY_RANDOM.increment) >>> 0;

  return seed / SCENERY_RANDOM.modulus;
};

export const trees: Tree[] = [];

for (let i = 0; i < VILLAGE_DEFINITION.treeAttempts; i++) {
  const x = SCENERY_BOUNDS.left + random() * (ARENA.width - SCENERY_BOUNDS.horizontalInset);
  const y = SCENERY_BOUNDS.top + random() * (ARENA.height - SCENERY_BOUNDS.verticalInset);

  if (sceneryClearing(x, y)) {
    continue;
  }

  if (
    trees.some((tree) => {
      return Math.hypot(tree.x - x, tree.y - y) < SCENERY_CLEARANCE.separation;
    })
  ) {
    continue;
  }

  trees.push({
    x,
    y,
    size: VILLAGE_TREE.minSize + Math.floor(random() * VILLAGE_TREE.sizeRange),
    radius: VILLAGE_TREE.radius,
  });
}
