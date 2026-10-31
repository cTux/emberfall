import type { DrawingContext } from '../rendering/drawing-context';
import { drawWorldBar } from '../world-bar.ts';

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

    if (line && ctx.measureText(next).width > 200) {
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
    ) + 16;
  const height = lines.length * 13 + 10;
  const bottom = y - 52; // Two units above the player health bar; overlays the debuff area.
  const left = x - width / 2;
  const right = x + width / 2;
  const top = bottom - height;
  ctx.fillStyle = '#15211eee';
  ctx.strokeStyle = '#b9c9b65c';
  ctx.lineWidth = 1;
  ctx.shadowColor = '#00000055';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  ctx.beginPath();
  ctx.moveTo(left + 8, top);
  ctx.lineTo(right - 8, top);
  ctx.quadraticCurveTo(right, top, right, top + 8);
  ctx.lineTo(right, bottom - 8);
  ctx.quadraticCurveTo(right, bottom, right - 8, bottom);
  ctx.lineTo(left + 8, bottom);
  ctx.quadraticCurveTo(left, bottom, left, bottom - 8);
  ctx.lineTo(left, top + 8);
  ctx.quadraticCurveTo(left, top, left + 8, top);
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.stroke();
  ctx.fillStyle = '#f4ecd6';
  lines.forEach((line, i) => {
    return ctx.fillText(line, x, top + 11.5 + i * 13);
  });
  ctx.restore();
}

export function drawInteractionPrompt(ctx: DrawingContext, x: number, y: number, label: string) {
  ctx.save();
  ctx.font = '9px "Alegreya Sans", sans-serif';
  ctx.textBaseline = 'middle';
  const width = 24 + ctx.measureText(label).width;
  const left = x - width / 2;
  const centerY = y - 23;
  const keyX = left + 8;
  const surface = ctx.createLinearGradient(0, centerY - 8, 0, centerY + 8);
  surface.addColorStop(0, '#303126');
  surface.addColorStop(1, '#171c17');
  const bronze = ctx.createLinearGradient(0, centerY - 8, 0, centerY + 8);
  bronze.addColorStop(0, '#f2d6a0');
  bronze.addColorStop(0.5, '#b48c57');
  bronze.addColorStop(1, '#725332');
  ctx.beginPath();
  ctx.arc(keyX, centerY, 8, Math.PI / 2, Math.PI * 1.5);
  ctx.arc(left + width - 8, centerY, 8, -Math.PI / 2, Math.PI / 2);
  ctx.closePath();
  ctx.fillStyle = surface;
  ctx.shadowColor = '#00000080';
  ctx.shadowBlur = 2;
  ctx.shadowOffsetY = 1;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = bronze;
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // Concentric rings keep the rim and capsule inset equal on every side.
  ctx.beginPath();
  ctx.arc(keyX, centerY, 6, 0, Math.PI * 2);
  ctx.fillStyle = bronze;
  ctx.shadowColor = '#000000b0';
  ctx.shadowOffsetY = 1.5;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  const face = ctx.createLinearGradient(keyX - 4, centerY - 4, keyX + 4, centerY + 4);
  face.addColorStop(0, '#8a7c55');
  face.addColorStop(0.45, '#49432c');
  face.addColorStop(1, '#29291e');
  ctx.beginPath();
  ctx.arc(keyX, centerY, 5, 0, Math.PI * 2);
  ctx.fillStyle = face;
  ctx.fill();
  ctx.strokeStyle = '#292418';
  ctx.lineWidth = 0.4;
  ctx.stroke();
  ctx.fillStyle = '#f4ecd6';
  ctx.textAlign = 'center';
  ctx.fillText('E', keyX, centerY);
  ctx.textAlign = 'left';
  ctx.fillText(label, left + 18, centerY);
  ctx.restore();
}

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
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.strokeText(label, x, y + metrics.actualBoundingBoxAscent);
  ctx.fillStyle = color;
  ctx.fillText(label, x, y + metrics.actualBoundingBoxAscent);
  ctx.restore();
}

export function drawNameBadge(ctx: DrawingContext, x: number, y: number, name: string) {
  ctx.save();
  ctx.font = '9px "Alegreya Sans", sans-serif';
  ctx.textAlign = 'center';
  const label = name;
  const width = ctx.measureText(label).width + 12;
  ctx.fillStyle = '#302d20';
  ctx.fillRect(x - width / 2, y - 20, width, 13);
  ctx.fillStyle = '#e0c995';
  ctx.fillText(label, x, y - 10);
  ctx.restore();
}

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
  const width = Math.max(boss ? 64 : 40, Math.ceil(metrics.width) + 12);
  const bottom = y + (boss ? 9 : 7);

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
