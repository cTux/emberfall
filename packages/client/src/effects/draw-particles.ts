import type { DrawingContext } from '../rendering/drawing-context';
import { FIREFLIES } from './world-style.ts';

export function drawParticles(
  ctx: DrawingContext,
  x: number,
  y: number,
  width: number,
  height: number,
  now: number,
) {
  ctx.save();
  ctx.fillStyle = '#eed389';

  for (
    let row = Math.floor((y - FIREFLIES.cullMargin) / FIREFLIES.cellSize);
    row <= Math.ceil((y + height + FIREFLIES.cullMargin) / FIREFLIES.cellSize);
    row++
  ) {
    for (
      let col = Math.floor((x - FIREFLIES.cullMargin) / FIREFLIES.cellSize);
      col <= Math.ceil((x + width + FIREFLIES.cullMargin) / FIREFLIES.cellSize);
      col++
    ) {
      const seed =
        (((col % FIREFLIES.seedColumns) + FIREFLIES.seedColumns) % FIREFLIES.seedColumns) *
          FIREFLIES.columnSeed +
        (((row % FIREFLIES.seedRows) + FIREFLIES.seedRows) % FIREFLIES.seedRows) *
          FIREFLIES.rowSeed;
      ctx.globalAlpha =
        FIREFLIES.opacity +
        Math.sin(now / FIREFLIES.flickerPeriodMs + seed) * FIREFLIES.flickerRange;
      ctx.fillRect(
        col * FIREFLIES.cellSize +
          (seed % FIREFLIES.xScatter) +
          Math.sin(now / FIREFLIES.xPeriodMs + seed) * FIREFLIES.xDrift,
        row * FIREFLIES.cellSize +
          (seed % FIREFLIES.yScatter) +
          Math.cos(now / FIREFLIES.yPeriodMs + seed) * FIREFLIES.yDrift,
        2,
        2,
      );
    }
  }

  ctx.restore();
}
