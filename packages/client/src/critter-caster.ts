import { animalColumn } from './animal-column.ts';
import { CRITTER_ART } from './critter-art.ts';
import type { crittersAt } from './critter-motion.ts';
import { spriteMask } from './lighting.ts';
import { animalArt } from './art';

// Animal sheets use 64-pixel frames; the approved 24-pixel display footprint sets both sprites and shadow bounds.

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
