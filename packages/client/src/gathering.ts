import type { DrawingContext } from './rendering/drawing-context';
import type { ResourceNode } from '@emberfall/core';
import type { ResourceState } from '@emberfall/common';
import { environmentArt, gatheredArt, plantArt, loadNativeArt } from './art';
import { makeMask } from './lighting';
import type { Scenery } from './village';
import { drawWorldBar } from './world-bar';
import { PLANT_KINDS } from '@emberfall/core';

// Source art grids use 128-pixel scenery frames and 64-pixel plants; depleted stumps retain their approved 48% scale.
const RESOURCE_ART = {
  frameSize: 128,
  plantFrameSize: 64,
  stumpScale: 0.48,
  treeHarvests: 5,
  plantColumn: 2,
  rockRow: 2,
} as const;

const stoneArt = loadNativeArt('stone-node');
const stoneGatheredArt = loadNativeArt('stone-gathered');
const gatheredPlants = PLANT_KINDS.map((id) => {
  return loadNativeArt(`gathered-${id}`);
});
export const resourceStateArt = [stoneArt, stoneGatheredArt, ...gatheredPlants];
const frames = new Map<string, { sprite: HTMLCanvasElement; mask: HTMLCanvasElement }>();
export function resourceScenery(node: ResourceNode, state?: ResourceState): Scenery {
  const depleted = state?.remaining === 0;
  const dedicated =
    node.kind === 'stone' || (depleted && node.kind === 'plant' && node.variant !== undefined);
  const column = dedicated
    ? 0
    : depleted
      ? node.kind === 'tree'
        ? 0
        : node.kind === 'plant'
          ? RESOURCE_ART.plantColumn
          : 1
      : node.kind === 'tree'
        ? 0
        : RESOURCE_ART.plantColumn;
  const row = dedicated || depleted ? 0 : node.kind === 'rock' ? RESOURCE_ART.rockRow : 1;
  const plant = !depleted && node.kind === 'plant' && node.variant !== undefined;
  const image =
    node.kind === 'stone'
      ? depleted
        ? stoneGatheredArt
        : stoneArt
      : depleted && node.kind === 'plant' && node.variant !== undefined
        ? gatheredPlants[node.variant]
        : depleted
          ? gatheredArt
          : plant
            ? plantArt
            : environmentArt;
  const key = `${node.kind}:${depleted}:${column}:${row}:${node.variant ?? ''}`;
  let frame = frames.get(key);

  if (!frame || !image.naturalWidth || image.dataset.artReady !== 'true') {
    const sprite = document.createElement('canvas');
    const resolution = Number(image.dataset.artResolution ?? 1);
    sprite.width = sprite.height = RESOURCE_ART.frameSize * resolution;

    if (image.naturalWidth && image.dataset.artReady === 'true') {
      sprite
        .getContext('2d')!
        .drawImage(
          image,
          (plant ? node.variant! : column) *
            (plant ? RESOURCE_ART.plantFrameSize : RESOURCE_ART.frameSize) *
            resolution,
          plant ? 0 : row * RESOURCE_ART.frameSize * resolution,
          (plant ? RESOURCE_ART.plantFrameSize : RESOURCE_ART.frameSize) * resolution,
          (plant ? RESOURCE_ART.plantFrameSize : RESOURCE_ART.frameSize) * resolution,
          0,
          0,
          sprite.width,
          sprite.height,
        );
      frame = { sprite, mask: makeMask(sprite) };
      frames.set(key, frame);
    } else {
      frame = { sprite, mask: makeMask(sprite) };
    }
  }

  const size = depleted && node.kind === 'tree' ? node.size * RESOURCE_ART.stumpScale : node.size;

  return { ...node, gathered: depleted, width: size, height: size, ...frame };
}

export function drawResourceHealth(ctx: DrawingContext, node: ResourceNode, state?: ResourceState) {
  if (
    node.kind !== 'tree' ||
    !state ||
    state.remaining <= 0 ||
    state.remaining >= RESOURCE_ART.treeHarvests
  ) {
    return;
  }

  drawWorldBar(
    ctx,
    node.x - 20,
    node.y - node.size - 4,
    40,
    state.remaining / RESOURCE_ART.treeHarvests,
    '#a4cf7b',
  );
}
