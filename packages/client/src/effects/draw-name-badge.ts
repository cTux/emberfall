import type { DrawingContext } from '../rendering/drawing-context';
import { LABEL_STYLE as STYLE } from './label-style.ts';

export function drawNameBadge(ctx: DrawingContext, x: number, y: number, name: string) {
  ctx.save();
  ctx.font = '9px "Alegreya Sans", sans-serif';
  ctx.textAlign = 'center';
  const label = name;
  const width = ctx.measureText(label).width + STYLE.badge.padding;
  ctx.fillStyle = '#302d20';
  ctx.fillRect(x - width / 2, y - STYLE.badge.top, width, STYLE.badge.height);
  ctx.fillStyle = '#e0c995';
  ctx.fillText(label, x, y - STYLE.badge.baseline);
  ctx.restore();
}
