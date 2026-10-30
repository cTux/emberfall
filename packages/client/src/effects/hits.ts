import type { DrawingContext } from '../rendering/drawing-context';
import type { WorldState } from '@emberfall/common';

export function hitOutline(mask: HTMLCanvasElement, color = '#ff3737', radius = 2) {
  const outline = document.createElement('canvas');
  outline.width = mask.width + radius * 2;
  outline.height = mask.height + radius * 2;
  const c = outline.getContext('2d')!;
  for (const [x, y] of [
    [0, 2],
    [4, 2],
    [2, 0],
    [2, 4],
    [1, 1],
    [3, 3],
    [1, 3],
    [3, 1],
  ])
    c.drawImage(mask, (x * radius) / 2, (y * radius) / 2);
  c.globalCompositeOperation = 'source-in';
  c.fillStyle = color;
  c.fillRect(0, 0, outline.width, outline.height);
  c.globalCompositeOperation = 'destination-out';
  c.drawImage(mask, radius, radius);
  return outline;
}
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
  if (age < 0 || age >= 220) return;
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
  const padX = (2 * width) / mask.width;
  const padY = (2 * height) / mask.height;
  ctx.save();
  ctx.globalAlpha *= 1 - age / 220;
  ctx.drawImage(sprites.outline, x - padX, y - padY, width + padX * 2, height + padY * 2);
  ctx.drawImage(sprites.tint, x, y, width, height);
  ctx.restore();
}
export function drawDamageFlash(ctx: DrawingContext, world: WorldState | null, id: string) {
  const hit = world?.scene?.damage.filter((d) => d.target === id).at(-1);
  const age = (world?.serverNow ?? 0) - (hit?.at ?? -10000);
  if (age < 0 || age > 280) return;
  ctx.save();
  ctx.resetTransform();
  ctx.globalAlpha *= 0.22 * (1 - age / 280);
  ctx.fillStyle = '#ff1923';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}
const partyOutlines = new WeakMap<HTMLCanvasElement, Map<boolean, HTMLCanvasElement>>();
export function drawPartyOutline(
  ctx: DrawingContext,
  mask: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
  highlighted = false,
) {
  let cache = partyOutlines.get(mask);
  if (!cache) partyOutlines.set(mask, (cache = new Map()));
  let outline = cache.get(highlighted);
  if (!outline) {
    const silhouette = document.createElement('canvas');
    silhouette.width = 48;
    silhouette.height = 48;
    silhouette.getContext('2d')!.drawImage(mask, 0, 0, 48, 48);
    outline = hitOutline(silhouette, highlighted ? '#00ff00' : '#339dff', 1);
    cache.set(highlighted, outline);
  }
  ctx.drawImage(outline, x - width / 48, y - height / 48, (width * 50) / 48, (height * 50) / 48);
}
