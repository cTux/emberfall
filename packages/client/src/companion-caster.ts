import { companionFrame } from './companion-frame.ts';
import { BEAR_ART } from './bear-art.ts';
import type { Bear } from '@emberfall/core/contracts';
import { spriteMask } from './lighting';

// Bear sheet rows/columns and display bounds preserve the packaged cub's existing foot anchor and scale.
import { bearArt as image } from './art';

export function companionCaster(bear: Bear, x: number, y: number, now: number, id: string) {
  if (bear.hitpoints <= 0) {
    return null;
  }

  const { column, left } = companionFrame(bear, now);
  const scale = (bear.size ?? BEAR_ART.baseSize) / BEAR_ART.baseSize;
  const mask = spriteMask(
    image,
    column % BEAR_ART.columns,
    Math.floor(column / BEAR_ART.columns),
    left,
    BEAR_ART.cell,
    false,
    BEAR_ART.cell,
  );

  return mask
    ? {
        id,
        x,
        y: y + BEAR_ART.footOffset + BEAR_ART.shadowFootOffset * scale,
        width: BEAR_ART.width * scale,
        height: BEAR_ART.height * scale,
        mask,
      }
    : null;
}
