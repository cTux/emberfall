import type { DrawingContext } from '../rendering/drawing-context';
import type { DebuffIndicator } from '@emberfall/common';
import { statusImages } from '../combat-assets';

// Twelve-pixel icons plus a two-pixel gap keep the compact status row legible at game scale.
const DEBUFF_STYLE = { size: 12, stride: 14, stroke: 2, stackRight: 11 } as const;

export function drawDebuffs(
  ctx: DrawingContext,
  target: { debuffs?: readonly DebuffIndicator[] },
  x: number,
  y: number,
  now: number,
) {
  const debuffs =
    target.debuffs?.filter((d) => {
      return d.expiresAt === undefined || d.expiresAt > now;
    }) ?? [];
  ctx.save();
  ctx.font = 'bold 8px "Alegreya Sans", sans-serif';
  ctx.textAlign = 'right';
  ctx.lineJoin = 'round';
  ctx.lineWidth = DEBUFF_STYLE.stroke;
  ctx.imageSmoothingEnabled = false;
  debuffs.forEach((debuff, index) => {
    const px = x + index * DEBUFF_STYLE.stride;
    const image = statusImages[debuff.kind];

    if (image.naturalWidth) {
      ctx.drawImage(image, px, y - DEBUFF_STYLE.size, DEBUFF_STYLE.size, DEBUFF_STYLE.size);
    }

    if (debuff.kind === 'silence' || debuff.stacks === undefined) {
      return;
    }

    ctx.strokeStyle = '#101817';
    ctx.strokeText(String(debuff.stacks), px + DEBUFF_STYLE.stackRight, y - 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(debuff.stacks), px + DEBUFF_STYLE.stackRight, y - 1);
  });
  ctx.restore();
}
