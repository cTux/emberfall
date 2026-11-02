import type { DrawingContext } from '../rendering/drawing-context';
import { LABEL_STYLE as STYLE } from './label-style.ts';

export function drawCharacterName(
  ctx: DrawingContext,
  x: number,
  y: number,
  name: string,
  color = '#ffffff',
) {
  ctx.save();
  ctx.font = '8px "Alegreya Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const label = name;
  const metrics = ctx.measureText(label);
  ctx.strokeStyle = '#101817';
  ctx.lineWidth = STYLE.nameStrokeWidth;
  ctx.lineJoin = 'round';
  ctx.strokeText(label, x, y + metrics.actualBoundingBoxAscent);
  ctx.fillStyle = color;
  ctx.fillText(label, x, y + metrics.actualBoundingBoxAscent);
  ctx.restore();
}
