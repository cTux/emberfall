import { puff } from './puff.ts';
import { AMBIENT } from './ambient.ts';
import type { DrawingContext } from './rendering/drawing-context';

const smoke = puff('#d6cfc1');

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
