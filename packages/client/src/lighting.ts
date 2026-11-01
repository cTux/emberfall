import type { DrawingContext } from './rendering/drawing-context';

// Existing local-light projection caps stretch before near-equal light/caster heights create enormous silhouettes.
const SHADOW = {
  maximumRadiusRatio: 0.8,
  minimumHeightGap: 20,
  maximumOpacity: 0.65,
  contactAlpha: 32,
  rgbaChannels: 4,
  alphaChannel: 3,
  defaultFrameSize: 16,
} as const;

export interface Light {
  x: number;
  y: number;
  height: number;
  radius: number;
  strength: number;
  owner?: string;
}
export interface DirectionalShadow {
  x: number;
  y: number;
  opacity: number;
}
export interface Caster {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  mask: CanvasImageSource;
}
const maskBottomInsets = new WeakMap<CanvasImageSource, number>();

export function shadowProjection(
  caster: { x: number; y: number; height: number },
  light?: Light,
  bottomInset = 0,
  directional: DirectionalShadow = { x: 0.6, y: 0.8, opacity: 0.26 },
) {
  if (!light) {
    return {
      x: directional.x * caster.height,
      y: directional.y * caster.height,
      opacity: directional.opacity,
    };
  }

  const dx = caster.x - light.x,
    dy = caster.y - bottomInset - light.y;
  const distance = Math.hypot(dx, dy);

  if (distance >= light.radius || distance < 1) {
    return null;
  }

  const length = Math.min(
    light.radius * SHADOW.maximumRadiusRatio,
    (distance * caster.height) / Math.max(SHADOW.minimumHeightGap, light.height - caster.height),
  );

  return {
    x: (dx / distance) * length,
    y: (dy / distance) * length,
    opacity: SHADOW.maximumOpacity * (1 - distance / light.radius),
  };
}

export function castShadow(ctx: DrawingContext, caster: Caster, light?: Light) {
  if (light?.owner === caster.id) {
    return;
  }

  const bottomInset = (maskBottomInsets.get(caster.mask) ?? 0) * caster.height;
  const projection = shadowProjection(caster, light, bottomInset, ctx.directionalShadow);

  if (!projection || projection.opacity <= 0) {
    return;
  }

  ctx.save();
  ctx.occlusion = false;
  ctx.globalAlpha = projection.opacity;
  ctx.translate(caster.x, caster.y - bottomInset);
  ctx.transform(1, 0, -projection.x / caster.height, -projection.y / caster.height, 0, 0);
  ctx.drawImage(
    caster.mask,
    -caster.width / 2,
    -caster.height + bottomInset,
    caster.width,
    caster.height,
  );
  ctx.restore();
}

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
