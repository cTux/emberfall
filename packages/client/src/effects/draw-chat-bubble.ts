import type { DrawingContext } from '../rendering/drawing-context';
import { LABEL_STYLE as STYLE } from './label-style.ts';

export function drawChatBubble(ctx: DrawingContext, x: number, y: number, text?: string) {
  if (!text) {
    return;
  }

  ctx.save();
  ctx.font = '10px "Alegreya Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = [''];

  for (const word of text.trim().split(/\s+/u)) {
    const line = lines.at(-1)!;
    const next = line ? `${line} ${word}` : word;

    if (line && ctx.measureText(next).width > STYLE.chat.wrapWidth) {
      lines.push(word);
    } else {
      lines[lines.length - 1] = next;
    }
  }

  const width =
    Math.max(
      ...lines.map((line) => {
        return ctx.measureText(line).width;
      }),
    ) + STYLE.chat.horizontalPadding;
  const height = lines.length * STYLE.chat.lineHeight + STYLE.chat.verticalPadding;
  const bottom = y - STYLE.chat.bottomOffset;
  const left = x - width / 2;
  const right = x + width / 2;
  const top = bottom - height;
  ctx.fillStyle = '#15211eee';
  ctx.strokeStyle = '#b9c9b65c';
  ctx.lineWidth = 1;
  ctx.shadowColor = '#00000055';
  ctx.shadowBlur = STYLE.chat.shadowBlur;
  ctx.shadowOffsetY = STYLE.chat.shadowOffset;
  ctx.beginPath();
  ctx.moveTo(left + STYLE.chat.cornerRadius, top);
  ctx.lineTo(right - STYLE.chat.cornerRadius, top);
  ctx.quadraticCurveTo(right, top, right, top + STYLE.chat.cornerRadius);
  ctx.lineTo(right, bottom - STYLE.chat.cornerRadius);
  ctx.quadraticCurveTo(right, bottom, right - STYLE.chat.cornerRadius, bottom);
  ctx.lineTo(left + STYLE.chat.cornerRadius, bottom);
  ctx.quadraticCurveTo(left, bottom, left, bottom - STYLE.chat.cornerRadius);
  ctx.lineTo(left, top + STYLE.chat.cornerRadius);
  ctx.quadraticCurveTo(left, top, left + STYLE.chat.cornerRadius, top);
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.stroke();
  ctx.fillStyle = '#f4ecd6';
  lines.forEach((line, i) => {
    return ctx.fillText(line, x, top + STYLE.chat.firstBaseline + i * STYLE.chat.lineHeight);
  });
  ctx.restore();
}
