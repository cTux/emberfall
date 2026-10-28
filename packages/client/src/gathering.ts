import type { ResourceNode } from '@emberfall/core';
import type { ResourceState } from '@emberfall/common';
import { environmentArt, gatheredArt, plantArt } from './art';
import { makeMask } from './lighting';
import type { Scenery } from './village';
import { drawWorldBar } from './world-bar';
const frames = new Map<string, { sprite: HTMLCanvasElement; mask: HTMLCanvasElement }>();
export function resourceScenery(node: ResourceNode, state?: ResourceState): Scenery {
  const depleted = state?.remaining === 0;
  const column = depleted
    ? node.kind === 'tree'
      ? 0
      : node.kind === 'plant'
        ? 2
        : 1
    : node.kind === 'tree'
      ? 0
      : 2;
  const row = depleted ? 0 : node.kind === 'rock' || node.kind === 'stone' ? 2 : 1;
  const plant = !depleted && node.kind === 'plant' && node.variant !== undefined;
  const image = depleted ? gatheredArt : plant ? plantArt : environmentArt;
  const key = `${depleted}:${column}:${row}:${plant ? node.variant : ''}`;
  let frame = frames.get(key);
  if (!frame || !image.naturalWidth || image.dataset.artReady !== 'true') {
    const sprite = document.createElement('canvas');
    const resolution = Number(image.dataset.artResolution ?? 1);
    sprite.width = sprite.height = 128 * resolution;
    if (image.naturalWidth && image.dataset.artReady === 'true') {
      sprite
        .getContext('2d')!
        .drawImage(
          image,
          (plant ? node.variant! : column) * (plant ? 64 : 128) * resolution,
          plant ? 0 : row * 128 * resolution,
          (plant ? 64 : 128) * resolution,
          (plant ? 64 : 128) * resolution,
          0,
          0,
          sprite.width,
          sprite.height,
        );
      frame = { sprite, mask: makeMask(sprite) };
      frames.set(key, frame);
    } else frame = { sprite, mask: makeMask(sprite) };
  }
  const size = depleted && node.kind === 'tree' ? node.size * 0.48 : node.size;
  return { ...node, gathered: depleted, width: size, height: size, ...frame };
}
export function drawResourceHealth(
  ctx: CanvasRenderingContext2D,
  node: ResourceNode,
  state?: ResourceState,
) {
  if (node.kind !== 'tree' || !state || state.remaining <= 0 || state.remaining >= 5) return;
  drawWorldBar(ctx, node.x - 20, node.y - node.size - 4, 40, state.remaining / 5, '#a4cf7b');
}
