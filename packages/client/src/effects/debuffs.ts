import type { DrawingContext } from '../rendering/drawing-context';
import type { DebuffIndicator } from '@emberfall/common';
import { statusImages } from '../combat-assets';

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
  ctx.lineWidth = 2;
  ctx.imageSmoothingEnabled = false;
  debuffs.forEach((debuff, index) => {
    const px = x + index * 14;
    const image = statusImages[debuff.kind];
    if (image.naturalWidth) {
      ctx.drawImage(image, px, y - 12, 12, 12);
    }

    if (debuff.kind === 'silence' || debuff.stacks === undefined) {
      return;
    }

    ctx.strokeStyle = '#101817';
    ctx.strokeText(String(debuff.stacks), px + 11, y - 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(debuff.stacks), px + 11, y - 1);
  });
  ctx.restore();
}
