import type { DrawingContext } from './rendering/drawing-context';
import type { GraphicsSettings } from './graphics';
import { drawParticles, drawAtmosphere, drawVignette } from './effects';
import { drawFog } from './fog';

export function drawEnvironment(
  ctx: DrawingContext,
  viewport: { x: number; y: number; width: number; height: number },
  now: number,
  quality: GraphicsSettings,
  daylight: number,
) {
  const { x, y, width, height } = viewport;
  if (quality.particles) drawParticles(ctx, x, y, width, height, now);
  if (quality.fog) drawFog(ctx, x, y, width, height, now);
  drawAtmosphere(ctx, x, y, width, height, now, quality, daylight);
  if (quality.vignette) drawVignette(ctx, x, y, width, height);
}
