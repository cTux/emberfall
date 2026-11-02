import { RESOURCE_ART } from './resource-art.ts';
import { stoneGatheredArt } from './stone-gathered-art.ts';
import { stoneArt } from './stone-art.ts';
import { gatheredPlants } from './gathered-plants.ts';
import type { ResourceNode } from '@emberfall/core';
import type { ResourceState } from '@emberfall/core/contracts';
import type { Scenery } from './village';
import { dimensionScenery } from './dimension-scenery';
import { gatheredArt, plantArt, environmentArt } from './art';
import { makeMask } from './lighting';

const frames = new Map<string, { sprite: HTMLCanvasElement; mask: HTMLCanvasElement }>();

export function resourceScenery(node: ResourceNode, state?: ResourceState): Scenery {
  if (node.dimension && node.dimension !== 'forest') {
    return dimensionScenery(node, state);
  }

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
