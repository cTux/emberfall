import type { DrawingContext } from './rendering/drawing-context';
import { artUrl, loadArt, loadNativeArt } from './art-loader';
export { artUrl, artImages, loadArt, actorArt, loadNativeArt } from './art-loader';

export const environmentArt = loadArt('environment', 3, 3, 128, true);
// Keep the approved buildings at native resolution, without square-cell repackaging.
export const buildingArt = loadNativeArt('buildings');
export const additionalBuildingArt: Record<string, HTMLImageElement> = {
  storehouse: loadNativeArt('building-storehouse'),
  lodge: loadNativeArt('building-lodge'),
};
export const buildingFrames = [
  { x: 38, y: 41, width: 638, height: 652, chimneyX: 453, chimneyY: 0 },
  { x: 751, y: 19, width: 661, height: 674, chimneyX: 521, chimneyY: 6 },
  { x: 1461, y: 89, width: 689, height: 605, chimneyX: 539, chimneyY: 0 },
] as const;
export const plantArt = loadArt('plants', 5, 1, 64, true);
export const wardrobeArt = loadArt('wardrobe', 4, 1, 128, true);
export const innkeeperArt = loadArt('innkeeper', 4, 1, 64, true);
export const animalArt = loadArt('animals', 4, 6, 64, true);
export const bearArt = loadArt('bear-cub', 4, 2, 64, true);
export const effectsArt = loadArt('effects', 4, 4, 128);
export const pickupArt = loadArt('pickups', 4, 3, 64);
export const terrainArt = new Image();
terrainArt.src = artUrl('terrain');
const terrainTiles = new Map<string, HTMLCanvasElement>();
export function terrainTile(column: number, size = 320) {
  const key = `${column}:${size}`;
  const cached = terrainTiles.get(key);
  if (cached) {
    return cached;
  }

  const tile = document.createElement('canvas');
  tile.width = tile.height = size;
  const ctx = tile.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  // PNG dimensions are available before its pixels finish loading. Caching a
  // draw at that point permanently retains an empty tile, even after onload.
  if (terrainArt.complete && terrainArt.naturalWidth) {
    const width = terrainArt.naturalWidth / 3;
    // Crossfade overlapping edges without mirroring the asymmetric scatter.
    // The first/last pixels share a sample, including at four-tile corners.
    const overlap = Math.max(1, Math.round(size / 8));
    const span = size - 1;
    const source = document.createElement('canvas');
    source.width = source.height = span + overlap;
    const sourceContext = source.getContext('2d', { willReadFrequently: true })!;
    sourceContext.imageSmoothingEnabled = false;
    sourceContext.drawImage(
      terrainArt,
      column * width,
      0,
      width,
      terrainArt.naturalHeight,
      0,
      0,
      source.width,
      source.height,
    );
    const pixels = sourceContext.getImageData(0, 0, source.width, source.height).data;
    const output = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      const blendY = Math.max(0, 1 - y / overlap);
      for (let x = 0; x < size; x++) {
        const blendX = Math.max(0, 1 - x / overlap);
        const a = (y * source.width + x) * 4;
        const b = (y * source.width + x + (blendX ? span : 0)) * 4;
        const c = ((y + (blendY ? span : 0)) * source.width + x) * 4;
        const d = c + (blendX ? span * 4 : 0);
        for (let channel = 0; channel < 4; channel++) {
          output.data[(y * size + x) * 4 + channel] =
            (pixels[a + channel] * (1 - blendX) + pixels[b + channel] * blendX) * (1 - blendY) +
            (pixels[c + channel] * (1 - blendX) + pixels[d + channel] * blendX) * blendY;
        }
      }
    }

    ctx.putImageData(output, 0, 0);
    terrainTiles.set(key, tile);
  }

  return tile;
}

export function drawArt(
  ctx: DrawingContext,
  image: HTMLImageElement,
  column: number,
  row: number,
  x: number,
  y: number,
  width: number,
  height: number,
  cell = 64,
) {
  if (!image.naturalWidth || image.dataset.artReady !== 'true') {
    return;
  }

  // PixiContext translates logical atlas coordinates itself; Canvas 2D does not.
  const sourceCell =
    cell * (ctx instanceof CanvasRenderingContext2D ? Number(image.dataset.artResolution ?? 1) : 1);
  ctx.drawImage(
    image,
    column * sourceCell,
    row * sourceCell,
    sourceCell,
    sourceCell,
    x,
    y,
    width,
    height,
  );
}

export const gatheredArt = loadArt('gathered', 3, 1, 128);
