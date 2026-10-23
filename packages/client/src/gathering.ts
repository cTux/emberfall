import type { ResourceNode } from '@emberfall/core';
import type { ResourceState } from '@emberfall/common';
import { environmentArt, gatheredArt } from './art';
import { makeMask } from './lighting';
import type { Scenery } from './village';
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
  const image = depleted ? gatheredArt : environmentArt;
  const key = `${depleted}:${column}:${row}`;
  let frame = frames.get(key);
  if (!frame || !image.naturalWidth || image.dataset.artReady !== 'true') {
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 128;
    if (image.naturalWidth && image.dataset.artReady === 'true') {
      sprite.getContext('2d')!.drawImage(image, column * 128, row * 128, 128, 128, 0, 0, 128, 128);
      frame = { sprite, mask: makeMask(sprite) };
      frames.set(key, frame);
    } else frame = { sprite, mask: makeMask(sprite) };
  }
  const size = depleted && node.kind === 'tree' ? node.size * 0.48 : node.size;
  return { ...node, width: size, height: size, ...frame };
}
export function drawResourceHealth(
  ctx: CanvasRenderingContext2D,
  node: ResourceNode,
  state?: ResourceState,
) {
  if (node.kind !== 'tree' || !state || state.remaining <= 0 || state.remaining >= 5) return;
  ctx.fillStyle = '#18251d';
  ctx.fillRect(node.x - 20, node.y - node.size - 10, 40, 6);
  ctx.fillStyle = '#a4cf7b';
  ctx.fillRect(node.x - 19, node.y - node.size - 9, (38 * state.remaining) / 5, 4);
}
