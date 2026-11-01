import type { DrawingContext } from './rendering/drawing-context';
import { loadArt, drawArt } from './art';

// The reusable 32-pixel radial texture is the existing balance between soft puffs and small upload size.
const PUFF_TEXTURE_SIZE = 32;
// Existing portal/smoke choreography: three orbiting motes, five staggered chimney puffs and slow fixed periods.
const AMBIENT = {
  portalCell: 128,
  portalMotes: 3,
  portalOrbitMs: 2300,
  portalAlpha: 0.38,
  smokePuffs: 5,
  smokeStaggerMs: 1700,
  smokeLifetimeMs: 8500,
  smokeSize: 8,
  smokeGrowth: 17,
  smokeAlpha: 0.19,
  smokeSwayFrequency: 5,
} as const;

export const portalArt = loadArt('portal-stone', 1, 1, AMBIENT.portalCell, true);

// Small reusable textures, not per-frame canvas uploads or blur filters.
function puff(color: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = PUFF_TEXTURE_SIZE;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(16, 16, 1, 16, 16, 16);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, '#0000');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);

  return canvas;
}

const smoke = puff('#d6cfc1');
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

/** Five slowly drifting puffs per visible chimney; fixed memory at all times. */
export function drawChimneySmoke(ctx: DrawingContext, x: number, y: number, now: number) {
  ctx.save();
  const opacity = ctx.globalAlpha;

  for (let i = 0; i < AMBIENT.smokePuffs; i++) {
    // Phase must not depend on projected coordinates, which wrap at world seams.
    const age =
      ((now + i * AMBIENT.smokeStaggerMs) % AMBIENT.smokeLifetimeMs) / AMBIENT.smokeLifetimeMs;
    const size = AMBIENT.smokeSize + age * AMBIENT.smokeGrowth;
    ctx.globalAlpha = opacity * Math.sin(age * Math.PI) * AMBIENT.smokeAlpha;
    ctx.drawImage(
      smoke,
      x + age * 12 + Math.sin(age * AMBIENT.smokeSwayFrequency + i) * age * 3 - size / 2,
      y - age * 40,
      size,
      size,
    );
  }

  ctx.restore();
}
