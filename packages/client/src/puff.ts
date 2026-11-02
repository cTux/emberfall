// The reusable 32-pixel radial texture is the existing balance between soft puffs and small upload size.
const PUFF_TEXTURE_SIZE = 32;
// Small reusable textures, not per-frame canvas uploads or blur filters.
export function puff(color: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = PUFF_TEXTURE_SIZE;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(16, 16, 1, 16, 16, 16);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, '#0000');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);

  return canvas;
}
