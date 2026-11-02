import { SHADOW } from './shadow.ts';
import { maskBottomInsets } from './mask-bottom-insets.ts';

export function makeMask(sprite: HTMLCanvasElement) {
  const mask = document.createElement('canvas');
  mask.width = sprite.width;
  mask.height = sprite.height;
  const ctx = mask.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(sprite, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#10161e';
  ctx.fillRect(0, 0, mask.width, mask.height);
  // Atlas padding is not ground. Measure contact once, before projecting the
  // silhouette, so transparent foot padding cannot lift it off its own shadow.
  const pixels = ctx.getImageData(0, 0, mask.width, mask.height).data;
  let bottom = mask.height;
  while (bottom > 0) {
    let occupied = false;

    for (let x = 0; x < mask.width; x++) {
      if (
        pixels[((bottom - 1) * mask.width + x) * SHADOW.rgbaChannels + SHADOW.alphaChannel] >=
        SHADOW.contactAlpha
      ) {
        occupied = true;
        break;
      }
    }

    if (occupied) {
      break;
    }

    bottom--;
  }

  maskBottomInsets.set(mask, (mask.height - bottom) / mask.height);

  return mask;
}
