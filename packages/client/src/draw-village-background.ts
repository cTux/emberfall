import type { DrawingContext } from './rendering/drawing-context';
import { ARENA } from '@emberfall/core';

/** Clip the source as well as the destination, including at the wrapping seams. */
export function drawVillageBackground(
  ctx: DrawingContext,
  background: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  for (let row = Math.floor(y / ARENA.height); row < (y + height) / ARENA.height; row++) {
    for (let col = Math.floor(x / ARENA.width); col < (x + width) / ARENA.width; col++) {
      const left = Math.max(x, col * ARENA.width);
      const top = Math.max(y, row * ARENA.height);
      const w = Math.min(x + width, (col + 1) * ARENA.width) - left;
      const h = Math.min(y + height, (row + 1) * ARENA.height) - top;
      ctx.drawImage(
        background,
        left - col * ARENA.width,
        top - row * ARENA.height,
        w,
        h,
        left,
        top,
        w,
        h,
      );
    }
  }
}
