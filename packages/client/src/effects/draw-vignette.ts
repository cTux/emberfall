import type { DrawingContext } from '../rendering/drawing-context';
import { VIGNETTE } from './world-style.ts';

export function drawVignette(
  ctx: DrawingContext,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const radius = Math.max(width, height) * VIGNETTE.outerScale;
  const gradient = ctx.createRadialGradient(
    x + width / 2,
    y + height / 2,
    radius * VIGNETTE.clearRadiusScale,
    x + width / 2,
    y + height / 2,
    radius,
  );
  gradient.addColorStop(0, '#08131000');
  gradient.addColorStop(1, '#081310aa');
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);
}
