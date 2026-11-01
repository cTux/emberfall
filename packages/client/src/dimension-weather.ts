import type { DimensionId } from '@emberfall/common';
import type { DrawingContext } from './rendering/drawing-context';
import type { GraphicsSettings } from './graphics';

// Screen-bounded particles keep weather costs independent of world size; weather never changes combat.
const WEATHER = {
  rainCount: 70,
  sandCount: 55,
  rainSpeed: 0.48,
  sandSpeed: 0.09,
  rainLength: 13,
  grainSize: 2,
  seedX: 137,
  seedY: 83,
  fogHeight: 0.55,
} as const;

export function drawDimensionWeather(
  ctx: DrawingContext,
  viewport: { x: number; y: number; width: number; height: number },
  now: number,
  quality: GraphicsSettings,
  dimension: DimensionId,
) {
  const { x, y, width, height } = viewport;
  ctx.save();

  if (quality.fog) {
    const fog = ctx.createLinearGradient(x, y + height * WEATHER.fogHeight, x, y + height);
    fog.addColorStop(0, '#00000000');
    fog.addColorStop(1, dimension === 'swamp' ? '#91bca331' : '#e6bc7540');
    ctx.fillStyle = fog;
    ctx.fillRect(x, y, width, height);
  }

  if (quality.particles) {
    const swamp = dimension === 'swamp';
    const count = swamp ? WEATHER.rainCount : WEATHER.sandCount;
    ctx.strokeStyle = '#b5d5cf66';
    ctx.fillStyle = '#f4d69b99';
    ctx.lineWidth = 1;

    for (let index = 0; index < count; index++) {
      const px = x + ((index * WEATHER.seedX + now * WEATHER.sandSpeed) % width);
      const py =
        y +
        ((index * WEATHER.seedY + now * (swamp ? WEATHER.rainSpeed : WEATHER.sandSpeed)) % height);

      if (swamp) {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - WEATHER.grainSize, py + WEATHER.rainLength);
        ctx.stroke();
      } else {
        ctx.fillRect(
          px,
          py + Math.sin(now / WEATHER.seedX + index) * WEATHER.grainSize,
          WEATHER.grainSize,
          1,
        );
      }
    }
  }

  ctx.restore();
}
