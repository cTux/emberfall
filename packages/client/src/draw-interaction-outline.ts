import type { InteractionTarget } from './interaction-target.ts';
import type { DrawingContext } from './rendering/drawing-context';
import { hitOutline } from './effects.ts';

const outlines = new WeakMap<HTMLCanvasElement, Map<string, HTMLCanvasElement>>();

export function drawInteractionOutline(ctx: DrawingContext, target: InteractionTarget) {
  // Bake at display size so wide houses and narrow NPCs have the same thickness.
  const radius = 1;
  const width = Math.round(target.width),
    height = Math.round(target.height);
  const color = target.highlighted ? '#00ff00' : '#ffdf00';
  const key = `${width}:${height}:${color}`;
  let cache = outlines.get(target.mask);

  if (!cache) {
    outlines.set(target.mask, (cache = new Map()));
  }

  let outline = cache.get(key);

  if (!outline) {
    const mask = document.createElement('canvas');
    mask.width = width;
    mask.height = height;
    mask.getContext('2d')!.drawImage(target.mask, 0, 0, width, height);
    outline = hitOutline(mask, color, radius);
    cache.set(key, outline);
  }

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.drawImage(outline, target.x - radius, target.y - radius);
  ctx.restore();
}
