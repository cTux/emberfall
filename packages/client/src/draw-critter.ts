import { animalColumn } from './animal-column.ts';
import { CRITTER_ART } from './critter-art.ts';
import type { DrawingContext } from './rendering/drawing-context';
import type { crittersAt } from './critter-motion.ts';
import { animalArt } from './art';

// Animal sheets use 64-pixel frames; the approved 24-pixel display footprint sets both sprites and shadow bounds.

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
