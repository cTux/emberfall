import { puff } from './puff.ts';
import { portalArt } from './portal-art.ts';
import { AMBIENT } from './ambient.ts';
import type { DrawingContext } from './rendering/drawing-context';
import { drawArt } from './art';

// The reusable 32-pixel radial texture is the existing balance between soft puffs and small upload size.

const energy = puff('#3eacff');

/** Only the aperture animates. Stone, silhouette and footprint are immutable. */
export function drawStonePortal(
  ctx: DrawingContext,
  x: number,
  y: number,
  width: number,
  height: number,
  now: number,
) {
  drawArt(ctx, portalArt, 0, 0, x, y, width, height, AMBIENT.portalCell);

  if (!portalArt.naturalWidth) {
    return;
  }

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x + width * 0.5, y + height * 0.58, width * 0.22, height * 0.3, 0, 0, Math.PI * 2);
  ctx.clip();
  const alpha = ctx.globalAlpha;

  for (let i = 0; i < AMBIENT.portalMotes; i++) {
    const phase = now / AMBIENT.portalOrbitMs + (i * Math.PI * 2) / AMBIENT.portalMotes;
    ctx.globalAlpha = alpha * AMBIENT.portalAlpha;
    ctx.drawImage(
      energy,
      x + width * (0.29 + Math.cos(phase) * 0.09),
      y + height * (0.32 + Math.sin(phase) * 0.17),
      width * 0.42,
      height * 0.42,
    );
  }

  ctx.restore();
}
