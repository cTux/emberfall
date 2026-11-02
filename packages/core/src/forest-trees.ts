import { forestDistance } from './forest-distance.ts';
import { FOREST_DEFINITION, FOREST, FOREST_PORTAL } from './definitions/worlds/forest.ts';
import { wrap } from '@emberfall/common';
import { SCENERY_RANDOM } from './scenery-seed.ts';

// Existing integer hash decorrelates adjacent cells while preserving deterministic tree identities.

// One deterministic trunk per grid cell; collision and rendering query only nearby cells.
// Existing integer hash decorrelates adjacent cells while preserving deterministic tree identities.
// Existing in-cell tree placement and art sizes preserve the forest layout used by both runtimes.
const FOREST_TREE_LAYOUT = {
  inset: 25,
  spread: 110,
  minSize: 78,
  sizeRange: 28,
  portalClearing: 180,
} as const;
const CELL_HASH = {
  columnOffset: 17,
  columnPrime: 73856093,
  rowOffset: 31,
  rowPrime: 19349663,
} as const;
export function forestTrees(x: number, y: number, radius: number) {
  const trees: {
    id: string;
    x: number;
    y: number;
    size: number;
    radius: number;
  }[] = [];

  for (
    let row = Math.floor((y - radius) / FOREST_DEFINITION.treeCellSize);
    row <= Math.floor((y + radius) / FOREST_DEFINITION.treeCellSize);
    row++
  ) {
    for (
      let col = Math.floor((x - radius) / FOREST_DEFINITION.treeCellSize);
      col <= Math.floor((x + radius) / FOREST_DEFINITION.treeCellSize);
      col++
    ) {
      const c = wrap(col, FOREST.width / FOREST_DEFINITION.treeCellSize),
        r = wrap(row, FOREST.height / FOREST_DEFINITION.treeCellSize);
      let seed =
        (Math.imul(c + CELL_HASH.columnOffset, CELL_HASH.columnPrime) ^
          Math.imul(r + CELL_HASH.rowOffset, CELL_HASH.rowPrime)) >>>
        0;
      const random = () => {
        seed = (Math.imul(seed, SCENERY_RANDOM.multiplier) + SCENERY_RANDOM.increment) >>> 0;

        return seed / SCENERY_RANDOM.modulus;
      };

      const tx =
          col * FOREST_DEFINITION.treeCellSize +
          FOREST_TREE_LAYOUT.inset +
          random() * FOREST_TREE_LAYOUT.spread,
        ty =
          row * FOREST_DEFINITION.treeCellSize +
          FOREST_TREE_LAYOUT.inset +
          random() * FOREST_TREE_LAYOUT.spread;

      if (
        forestDistance(
          {
            x: tx,
            y: ty,
          },
          FOREST_PORTAL,
        ) < FOREST_TREE_LAYOUT.portalClearing
      ) {
        continue;
      }

      trees.push({
        id: `forest:${c}:${r}`,
        x: tx,
        y: ty,
        size: FOREST_TREE_LAYOUT.minSize + random() * FOREST_TREE_LAYOUT.sizeRange,
        radius: FOREST_DEFINITION.treeRadius,
      });
    }
  }

  return trees;
}
