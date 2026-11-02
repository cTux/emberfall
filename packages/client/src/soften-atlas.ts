import { softenArtTones } from './art-tones';

// Preserve the measured source-sheet cut boundaries and duplicate walk row used by the approved generated art.

export function softenAtlas(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  softenArtTones(image.data, image.width, image.height);
  ctx.putImageData(image, 0, 0);
}
