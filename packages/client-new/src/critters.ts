import { crittersAt } from "./critter-motion.ts";
export { crittersAt } from "./critter-motion.ts";
import { spriteMask } from "./lighting.ts";
import { animalArt } from "./art";
const animalColumn = { cat: 1, chicken: 2, raccoon: 3 };
export function critterCaster(critter: ReturnType<typeof crittersAt>[number]) {
  const mask = spriteMask(
    animalArt,
    animalColumn[critter.kind],
    critter.frame,
    critter.left,
    64,
    false,
    64,
  );
  return mask
    ? {
        id: `critter:${critter.kind}:${critter.x}:${critter.y}`,
        x: critter.x,
        y: critter.y,
        width: 24,
        height: 24,
        mask,
      }
    : null;
}
export function drawCritter(
  ctx: CanvasRenderingContext2D,
  critter: ReturnType<typeof crittersAt>[number],
  shadows = false,
) {
  const image = animalArt;
  if (!image.naturalWidth) return;
  ctx.save();
  ctx.translate(critter.x, critter.y);
  if (!shadows) {
    ctx.fillStyle = "#06181050";
    ctx.beginPath();
    ctx.ellipse(0, -2, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (critter.left) ctx.scale(-1, 1);
  ctx.drawImage(
    image,
    animalColumn[critter.kind] * 64,
    critter.frame * 64,
    64,
    64,
    -12,
    -24,
    24,
    24,
  );
  ctx.restore();
}
