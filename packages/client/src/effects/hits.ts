import type { DrawingContext } from '../rendering/drawing-context';
import type { WorldState } from '@emberfall/common';

// Existing flash timings keep damage visible briefly without obscuring the next attack.
const HIT_STYLE = {
  outlineRadius: 2,
  targetDurationMs: 220,
  screenDurationMs: 280,
  screenOpacity: 0.22,
  // The absent-hit timestamp is deliberately older than either flash lifetime at startup.
  missingHitAt: -10000,
  // Fixed pose resampling keeps party outlines one game pixel thick independent of source art.
  partyMaskPixels: 48,
  partyOutlinePixels: 50,
} as const;

// Eight authored offsets dilate the silhouette around its center before subtraction.
const OUTLINE_OFFSETS = [
  [0, 2],
  [4, 2],
  [2, 0],
  [2, 4],
  [1, 1],
  [3, 3],
  [1, 3],
  [3, 1],
];

export function hitOutline(
  mask: HTMLCanvasElement,
  color = '#ff3737',
  radius: number = HIT_STYLE.outlineRadius,
) {
  const outline = document.createElement('canvas');
  outline.width = mask.width + radius * 2;
  outline.height = mask.height + radius * 2;
  const c = outline.getContext('2d')!;

  for (const [x, y] of OUTLINE_OFFSETS) {
    c.drawImage(mask, (x * radius) / 2, (y * radius) / 2);
  }

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

export function drawDamageFlash(ctx: DrawingContext, world: WorldState | null, id: string) {
  const hit = world?.scene?.damage
    .filter((d) => {
      return d.target === id;
    })
    .at(-1);
  const age = (world?.serverNow ?? 0) - (hit?.at ?? HIT_STYLE.missingHitAt);

  if (age < 0 || age > HIT_STYLE.screenDurationMs) {
    return;
  }

  ctx.save();
  ctx.resetTransform();
  ctx.globalAlpha *= HIT_STYLE.screenOpacity * (1 - age / HIT_STYLE.screenDurationMs);
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

  if (!cache) {
    partyOutlines.set(mask, (cache = new Map()));
  }

  let outline = cache.get(highlighted);

  if (!outline) {
    const silhouette = document.createElement('canvas');
    silhouette.width = HIT_STYLE.partyMaskPixels;
    silhouette.height = HIT_STYLE.partyMaskPixels;
    silhouette
      .getContext('2d')!
      .drawImage(mask, 0, 0, HIT_STYLE.partyMaskPixels, HIT_STYLE.partyMaskPixels);
    outline = hitOutline(silhouette, highlighted ? '#00ff00' : '#339dff', 1);
    cache.set(highlighted, outline);
  }

  ctx.drawImage(
    outline,
    x - width / HIT_STYLE.partyMaskPixels,
    y - height / HIT_STYLE.partyMaskPixels,
    (width * HIT_STYLE.partyOutlinePixels) / HIT_STYLE.partyMaskPixels,
    (height * HIT_STYLE.partyOutlinePixels) / HIT_STYLE.partyMaskPixels,
  );
}
