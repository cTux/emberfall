import { vegetationSway } from './vegetation-sway.ts';
import type { DrawingContext } from '../rendering/drawing-context';
import { WIND } from './world-style.ts';

export function drawVegetation(
  ctx: DrawingContext,
  sprite: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
  now: number,
  waving: boolean,
) {
  if (waving) {
    const sway = vegetationSway(x, y, width, height, now, sprite.width === WIND.grassSpritePixels);
    ctx.save();
    // Shear around the base: roots stay fixed while foliage catches the breeze.
    ctx.transform(1, 0, sway, 1, -sway * y, 0);
    ctx.drawImage(sprite, x - width / 2, y - height, width, height);
    ctx.restore();
  } else {
    ctx.drawImage(sprite, x - width / 2, y - height, width, height);
  }
}
