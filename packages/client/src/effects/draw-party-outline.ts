import { HIT_STYLE } from './hit-style.ts';
import { hitOutline } from './hit-outline.ts';
import type { DrawingContext } from '../rendering/drawing-context';

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
