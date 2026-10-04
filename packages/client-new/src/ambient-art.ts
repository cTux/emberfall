import { loadArt, drawArt } from "./art";

export const portalArt = loadArt("portal-stone", 1, 1, 128, true);
export const chimneyAnchors = [
  { x: 0.68, y: 0.055 },
  { x: 0.75, y: 0.055 },
  { x: 0.78, y: 0.055 },
];

// Small reusable textures, not per-frame canvas uploads or blur filters.
function puff(color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(16, 16, 1, 16, 16, 16);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "#0000");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);
  return canvas;
}
const smoke = puff("#d6cfc1");
const energy = puff("#3eacff");

/** Only the aperture animates. Stone, silhouette and footprint are immutable. */
export function drawStonePortal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  now: number,
) {
  drawArt(ctx, portalArt, 0, 0, x, y, width, height, 128);
  if (!portalArt.naturalWidth) return;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x + width * 0.5, y + height * 0.58, width * 0.22, height * 0.3, 0, 0, Math.PI * 2);
  ctx.clip();
  const alpha = ctx.globalAlpha;
  for (let i = 0; i < 3; i++) {
    const phase = now / 2300 + (i * Math.PI * 2) / 3;
    ctx.globalAlpha = alpha * 0.38;
    ctx.drawImage(
      energy,
      x + width * (0.29 + Math.cos(phase) * 0.09),
      y + height * (0.32 + Math.sin(phase) * 0.17),
      width * 0.42,
      height * 0.42,
    );
  }
  ctx.restore();
}

/** Five slowly drifting puffs per visible chimney; fixed memory at all times. */
export function drawChimneySmoke(ctx: CanvasRenderingContext2D, x: number, y: number, now: number) {
  ctx.save();
  const opacity = ctx.globalAlpha;
  for (let i = 0; i < 5; i++) {
    // Phase must not depend on projected coordinates, which wrap at world seams.
    const age = ((now + i * 1700) % 8500) / 8500;
    const size = 8 + age * 17;
    ctx.globalAlpha = opacity * Math.sin(age * Math.PI) * 0.19;
    ctx.drawImage(
      smoke,
      x + age * 12 + Math.sin(age * 5 + i) * age * 3 - size / 2,
      y - age * 40,
      size,
      size,
    );
  }
  ctx.restore();
}
