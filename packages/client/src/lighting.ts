export interface Light {
  x: number;
  y: number;
  height: number;
  radius: number;
  strength: number;
  owner?: string;
}
// Distant sun: its rays have the same direction across the entire village.
export const SUN = { x: -6000, y: -8000, height: 10000 } as const;
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
) {
  if (!light)
    return {
      x: (-SUN.x / SUN.height) * caster.height,
      y: (-SUN.y / SUN.height) * caster.height,
      opacity: 0.26,
    };
  const dx = caster.x - light.x,
    dy = caster.y - bottomInset - light.y;
  const distance = Math.hypot(dx, dy);
  if (distance >= light.radius || distance < 1) return null;
  const length = Math.min(
    light.radius * 0.8,
    (distance * caster.height) / Math.max(20, light.height - caster.height),
  );
  return {
    x: (dx / distance) * length,
    y: (dy / distance) * length,
    opacity: 0.65 * (1 - distance / light.radius),
  };
}
export function castShadow(ctx: CanvasRenderingContext2D, caster: Caster, light?: Light) {
  if (light?.owner === caster.id) return;
  const bottomInset = (maskBottomInsets.get(caster.mask) ?? 0) * caster.height;
  const projection = shadowProjection(caster, light, bottomInset);
  if (!projection) return;
  ctx.save();
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
  const mask = document.createElement("canvas");
  mask.width = sprite.width;
  mask.height = sprite.height;
  const ctx = mask.getContext("2d")!;
  ctx.drawImage(sprite, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = "#10161e";
  ctx.fillRect(0, 0, mask.width, mask.height);
  // Atlas padding is not ground. Measure contact once, before projecting the
  // silhouette, so transparent foot padding cannot lift it off its own shadow.
  const pixels = ctx.getImageData(0, 0, mask.width, mask.height).data;
  let bottom = mask.height;
  while (bottom > 0) {
    let occupied = false;
    for (let x = 0; x < mask.width; x++) {
      if (pixels[((bottom - 1) * mask.width + x) * 4 + 3] >= 32) {
        occupied = true;
        break;
      }
    }
    if (occupied) break;
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
  frameWidth = 16,
  trimBottom = false,
  frameHeight = 16,
) {
  if (!image.naturalWidth) return null;
  let masks = spriteMasks.get(image);
  if (!masks) spriteMasks.set(image, (masks = new Map()));
  const key = `${column}:${row}:${flip}:${frameWidth}:${trimBottom}:${frameHeight}`;
  if (!masks.has(key)) {
    const tile = document.createElement("canvas");
    tile.width = frameWidth;
    tile.height = frameHeight;
    const ctx = tile.getContext("2d")!;
    if (flip) {
      ctx.translate(frameWidth, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(
      image,
      column * frameWidth,
      row * frameHeight,
      frameWidth,
      frameHeight,
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
          .slice((bottom - 1) * tile.width * 4, bottom * tile.width * 4)
          .some((a, i) => i % 4 === 3 && a > 0)
      )
        bottom--;
      const cropped = document.createElement("canvas");
      cropped.width = tile.width;
      cropped.height = bottom;
      cropped.getContext("2d")!.drawImage(mask, 0, 0);
      masks.set(key, cropped);
    } else masks.set(key, mask);
  }
  return masks.get(key)!;
}
