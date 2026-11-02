import type { DrawingContext } from '../rendering/drawing-context';
import { LABEL_STYLE as STYLE } from './label-style.ts';

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
