import { drawCharacterName } from './draw-character-name.ts';
import type { DrawingContext } from '../rendering/drawing-context';
import { LABEL_STYLE as STYLE } from './label-style.ts';
import { drawWorldBar } from '../world-bar.ts';

export function drawPlayerHealth(
  ctx: DrawingContext,
  x: number,
  y: number,
  hp: number,
  max: number,
  name: string,
  color = '#ffffff',
  boss = false,
  showHealth = true,
) {
  ctx.save();
  ctx.font = '8px "Alegreya Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const metrics = ctx.measureText(name);
  const width = Math.max(
    boss ? STYLE.health.bossMinimumWidth : STYLE.health.minimumWidth,
    Math.ceil(metrics.width) + STYLE.health.padding,
  );
  const bottom = y + (boss ? STYLE.health.bossBottom : STYLE.health.bottom);

  // Grow upward to preserve the existing name and sprite clearance.
  if (showHealth) {
    drawWorldBar(
      ctx,
      x - width / 2,
      bottom,
      width,
      hp / Math.max(1, max),
      boss ? '#c084fc' : '#86d9a2',
    );
  }

  drawCharacterName(ctx, x, bottom, name, color);
  ctx.restore();

  return width;
}
