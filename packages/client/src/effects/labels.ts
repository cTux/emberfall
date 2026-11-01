import { LABEL_STYLE as STYLE } from './label-style.ts';
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

export function drawInteractionPrompt(ctx: DrawingContext, x: number, y: number, label: string) {
  ctx.save();
  ctx.font = '9px "Alegreya Sans", sans-serif';
  ctx.textBaseline = 'middle';
  const width = STYLE.interaction.horizontalPadding + ctx.measureText(label).width;
  const left = x - width / 2;
  const centerY = y - STYLE.interaction.centerOffset;
  const keyX = left + STYLE.interaction.keyOffset;
  const surface = ctx.createLinearGradient(
    0,
    centerY - STYLE.interaction.capsuleRadius,
    0,
    centerY + STYLE.interaction.capsuleRadius,
  );
  surface.addColorStop(0, '#303126');
  surface.addColorStop(1, '#171c17');
  const bronze = ctx.createLinearGradient(
    0,
    centerY - STYLE.interaction.capsuleRadius,
    0,
    centerY + STYLE.interaction.capsuleRadius,
  );
  bronze.addColorStop(0, '#f2d6a0');
  bronze.addColorStop(0.5, '#b48c57');
  bronze.addColorStop(1, '#725332');
  ctx.beginPath();
  ctx.arc(
    keyX,
    centerY,
    STYLE.interaction.capsuleRadius,
    Math.PI / 2,
    Math.PI * STYLE.interaction.arcTurns,
  );
  ctx.arc(
    left + width - STYLE.interaction.capsuleRadius,
    centerY,
    STYLE.interaction.capsuleRadius,
    -Math.PI / 2,
    Math.PI / 2,
  );
  ctx.closePath();
  ctx.fillStyle = surface;
  ctx.shadowColor = '#00000080';
  ctx.shadowBlur = STYLE.interaction.shadowBlur;
  ctx.shadowOffsetY = 1;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = bronze;
  ctx.lineWidth = STYLE.interaction.outlineWidth;
  ctx.stroke();

  // Concentric rings keep the rim and capsule inset equal on every side.
  ctx.beginPath();
  ctx.arc(keyX, centerY, STYLE.interaction.rimRadius, 0, Math.PI * 2);
  ctx.fillStyle = bronze;
  ctx.shadowColor = '#000000b0';
  ctx.shadowOffsetY = STYLE.interaction.faceShadowOffset;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  const face = ctx.createLinearGradient(
    keyX - STYLE.interaction.faceGradientExtent,
    centerY - STYLE.interaction.faceGradientExtent,
    keyX + STYLE.interaction.faceGradientExtent,
    centerY + STYLE.interaction.faceGradientExtent,
  );
  face.addColorStop(0, '#8a7c55');
  face.addColorStop(STYLE.interaction.faceGradientStop, '#49432c');
  face.addColorStop(1, '#29291e');
  ctx.beginPath();
  ctx.arc(keyX, centerY, STYLE.interaction.faceRadius, 0, Math.PI * 2);
  ctx.fillStyle = face;
  ctx.fill();
  ctx.strokeStyle = '#292418';
  ctx.lineWidth = STYLE.interaction.faceOutlineWidth;
  ctx.stroke();
  ctx.fillStyle = '#f4ecd6';
  ctx.textAlign = 'center';
  ctx.fillText('E', keyX, centerY);
  ctx.textAlign = 'left';
  ctx.fillText(label, left + STYLE.interaction.labelOffset, centerY);
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
  ctx.lineWidth = STYLE.nameStrokeWidth;
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
  const width = ctx.measureText(label).width + STYLE.badge.padding;
  ctx.fillStyle = '#302d20';
  ctx.fillRect(x - width / 2, y - STYLE.badge.top, width, STYLE.badge.height);
  ctx.fillStyle = '#e0c995';
  ctx.fillText(label, x, y - STYLE.badge.baseline);
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
