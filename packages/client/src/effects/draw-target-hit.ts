import { HIT_STYLE } from './hit-style.ts';
import { hitOutline } from './hit-outline.ts';
import type { DrawingContext } from '../rendering/drawing-context';

const hitSprites = new WeakMap<
  HTMLCanvasElement,
  { outline: HTMLCanvasElement; tint: HTMLCanvasElement }
>();

export function drawTargetHit(
  ctx: DrawingContext,
  mask: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
  age: number,
) {
  if (age < 0 || age >= HIT_STYLE.targetDurationMs) {
    return;
  }

  let sprites = hitSprites.get(mask);

  if (!sprites) {
    const tint = document.createElement('canvas');
    tint.width = mask.width;
    tint.height = mask.height;
    const c = tint.getContext('2d')!;
    c.drawImage(mask, 0, 0);
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, tint.width, tint.height);
    sprites = { outline: hitOutline(mask), tint };
    hitSprites.set(mask, sprites);
  }

  const padX = (HIT_STYLE.outlineRadius * width) / mask.width;
  const padY = (HIT_STYLE.outlineRadius * height) / mask.height;
  ctx.save();
  ctx.globalAlpha *= 1 - age / HIT_STYLE.targetDurationMs;
  ctx.drawImage(sprites.outline, x - padX, y - padY, width + padX * 2, height + padY * 2);
  ctx.drawImage(sprites.tint, x, y, width, height);
  ctx.restore();
}
