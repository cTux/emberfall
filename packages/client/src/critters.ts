import type { DrawingContext } from './rendering/drawing-context';
import type { crittersAt } from './critter-motion.ts';
export { crittersAt } from './critter-motion.ts';
import { spriteMask } from './lighting.ts';
import { animalArt } from './art';

// Animal sheets use 64-pixel frames; the approved 24-pixel display footprint sets both sprites and shadow bounds.
const CRITTER_ART = { cell: 64, size: 24 } as const;

const animalColumn = { cat: 1, chicken: 2, raccoon: 3 };
export function critterCaster(critter: ReturnType<typeof crittersAt>[number]) {
  const mask = spriteMask(
    animalArt,
    animalColumn[critter.kind],
    critter.frame,
    critter.left,
    CRITTER_ART.cell,
    false,
    CRITTER_ART.cell,
  );

  return mask
    ? {
        id: `critter:${critter.kind}:${critter.x}:${critter.y}`,
        x: critter.x,
        y: critter.y,
        width: CRITTER_ART.size,
        height: CRITTER_ART.size,
        mask,
      }
    : null;
}

export function drawCritter(
  ctx: DrawingContext,
  critter: ReturnType<typeof crittersAt>[number],
  shadows = false,
) {
  const image = animalArt;

  if (!image.naturalWidth) {
    return;
  }

  ctx.save();
  ctx.translate(critter.x, critter.y);

  if (!shadows) {
    ctx.fillStyle = '#06181050';
    ctx.beginPath();
    ctx.ellipse(0, -2, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (critter.left) {
    ctx.scale(-1, 1);
  }

  ctx.drawImage(
    image,
    animalColumn[critter.kind] * 64,
    critter.frame * 64,
    CRITTER_ART.cell,
    CRITTER_ART.cell,
    -12,
    -24,
    24,
    24,
  );
  ctx.restore();
}
