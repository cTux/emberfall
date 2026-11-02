import { SHADOW } from './shadow.ts';
import { makeMask } from './make-mask.ts';

const spriteMasks = new WeakMap<HTMLImageElement, Map<string, HTMLCanvasElement>>();

export function spriteMask(
  image: HTMLImageElement,
  column: number,
  row: number,
  flip = false,
  frameWidth: number = SHADOW.defaultFrameSize,
  trimBottom = false,
  frameHeight: number = SHADOW.defaultFrameSize,
) {
  if (!image.naturalWidth) {
    return null;
  }

  let masks = spriteMasks.get(image);

  if (!masks) {
    spriteMasks.set(image, (masks = new Map()));
  }

  const key = `${column}:${row}:${flip}:${frameWidth}:${trimBottom}:${frameHeight}`;

  if (!masks.has(key)) {
    const tile = document.createElement('canvas');
    tile.width = frameWidth;
    tile.height = frameHeight;
    const ctx = tile.getContext('2d', { willReadFrequently: trimBottom })!;

    if (flip) {
      ctx.translate(frameWidth, 0);
      ctx.scale(-1, 1);
    }

    const resolution = Number(image.dataset.artResolution ?? 1);
    ctx.drawImage(
      image,
      column * frameWidth * resolution,
      row * frameHeight * resolution,
      frameWidth * resolution,
      frameHeight * resolution,
      0,
      0,
      frameWidth,
      frameHeight,
    );
    const mask = makeMask(tile);

    if (trimBottom) {
      const pixels = ctx.getImageData(0, 0, tile.width, tile.height).data;
      let bottom = tile.height;
      while (
        bottom > 1 &&
        !pixels
          .slice(
            (bottom - 1) * tile.width * SHADOW.rgbaChannels,
            bottom * tile.width * SHADOW.rgbaChannels,
          )
          .some((a, i) => {
            return i % SHADOW.rgbaChannels === SHADOW.alphaChannel && a > 0;
          })
      ) {
        bottom--;
      }

      const cropped = document.createElement('canvas');
      cropped.width = tile.width;
      cropped.height = bottom;
      cropped.getContext('2d')!.drawImage(mask, 0, 0);
      masks.set(key, cropped);
    } else {
      masks.set(key, mask);
    }
  }

  return masks.get(key)!;
}
