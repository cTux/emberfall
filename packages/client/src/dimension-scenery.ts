import type { ResourceNode } from '@emberfall/core';
import type { ResourceState } from '@emberfall/common';
import { dimensionArt, DIMENSION_ATLAS } from './dimension-art';
import { makeMask } from './lighting';
import type { Scenery } from './village';

// Two-times backing detail covers the largest 106-unit tree; harvested trees keep their ground anchor.
const SCENERY_FRAME = { pixels: 256, stumpScale: 0.48 } as const;
const RESOURCE_COLUMNS = { tree: 0, plant: 1, rock: 2, stone: 2 } as const;
const frames = new Map<string, { sprite: HTMLCanvasElement; mask: HTMLCanvasElement }>();

export function dimensionScenery(node: ResourceNode, state?: ResourceState): Scenery {
  const dimension = node.dimension === 'desert' ? 'desert' : 'swamp';
  const image = dimensionArt(dimension, 'scenery');
  const depleted = state?.remaining === 0;
  const column = RESOURCE_COLUMNS[node.kind];
  const row = depleted ? 1 : 0;
  const key = `${dimension}:${column}:${row}`;
  let frame = frames.get(key);

  if (!frame) {
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = SCENERY_FRAME.pixels;

    if (image.complete && image.naturalWidth) {
      const width = image.naturalWidth / DIMENSION_ATLAS.columns;
      const height = image.naturalHeight / DIMENSION_ATLAS.sceneryRows;
      sprite
        .getContext('2d')!
        .drawImage(
          image,
          column * width,
          row * height,
          width,
          height,
          0,
          sprite.height * (1 - DIMENSION_ATLAS.footAnchor),
          sprite.width,
          sprite.height,
        );
      frame = { sprite, mask: makeMask(sprite) };
      frames.set(key, frame);
    } else {
      frame = { sprite, mask: makeMask(sprite) };
    }
  }

  const size = depleted && node.kind === 'tree' ? node.size * SCENERY_FRAME.stumpScale : node.size;

  return { ...node, gathered: depleted, width: size, height: size, ...frame };
}
