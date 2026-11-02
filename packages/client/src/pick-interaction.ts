import type { InteractionTarget } from './interaction-target.ts';
import { INTERACTION_GEOMETRY } from './interaction-geometry.ts';

const pixels = new WeakMap<HTMLCanvasElement, Uint8ClampedArray>();

/** Match the displayed sprite's opaque pixels, frontmost functional object first. */
export function pickInteraction(
  targets: readonly InteractionTarget[],
  point: { x: number; y: number } | undefined,
) {
  if (!point) {
    return null;
  }

  for (let i = targets.length - 1; i >= 0; i--) {
    const target = targets[i];
    const x = Math.floor(((point.x - target.x) * target.mask.width) / target.width);
    const y = Math.floor(((point.y - target.y) * target.mask.height) / target.height);

    if (x < 0 || y < 0 || x >= target.mask.width || y >= target.mask.height) {
      continue;
    }

    let data = pixels.get(target.mask);

    if (!data) {
      data = target.mask
        .getContext('2d')!
        .getImageData(0, 0, target.mask.width, target.mask.height).data;
      pixels.set(target.mask, data);
    }

    if (
      data[
        (y * target.mask.width + x) * INTERACTION_GEOMETRY.rgbaChannels +
          INTERACTION_GEOMETRY.alphaChannel
      ] > 0
    ) {
      return target;
    }
  }

  return null;
}
