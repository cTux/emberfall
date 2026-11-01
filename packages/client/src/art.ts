import type { DrawingContext } from './rendering/drawing-context';
import { artUrl, loadArt, loadNativeArt } from './art-loader';
import { BUILDING_SOURCE_SIZES } from '../asset-render-sizes.ts';

// These measured grids describe the shipped source PNGs; changing them changes which pixels form each frame.
const ATLAS_LAYOUT = {
  environment: [3, 3, 128],
  plants: [5, 1, 64],
  wardrobe: [4, 1, 128],
  innkeeper: [4, 1, 64],
  animals: [4, 6, 64],
  bear: [4, 2, 64],
  effects: [4, 4, 128],
  pickups: [4, 3, 64],
  gathered: [3, 1, 128],
} as const;
// Terrain PNGs contain three variants; a one-eighth overlap preserves the existing seamless edge crossfade.
const TERRAIN_LAYOUT = { tileSize: 320, columns: 3, overlapDivisor: 8, rgbaChannels: 4 } as const;
// Most packaged art uses logical 64-pixel cells; high-resolution images retain this logical coordinate grid.
const DEFAULT_ART_CELL = 64;

export { artUrl, artImages, loadArt, actorArt, loadNativeArt } from './art-loader';

export const environmentArt = loadArt('environment', ...ATLAS_LAYOUT.environment, true);

// Keep authored crop/chimney coordinates valid for original dev art and resized production art.
function loadBuildingArt(name: keyof typeof BUILDING_SOURCE_SIZES) {
  const image = loadNativeArt(name);
  image.addEventListener('load', () => {
    image.dataset.artResolution = String(image.naturalWidth / BUILDING_SOURCE_SIZES[name].width);
  });

  return image;
}

export const buildingArt = loadBuildingArt('buildings');
export const additionalBuildingArt: Record<string, HTMLImageElement> = {
  storehouse: loadBuildingArt('building-storehouse'),
  lodge: loadBuildingArt('building-lodge'),
};
export const buildingFrames = [
  { x: 38, y: 41, width: 638, height: 652, chimneyX: 453, chimneyY: 0 },
  { x: 751, y: 19, width: 661, height: 674, chimneyX: 521, chimneyY: 6 },
  { x: 1461, y: 89, width: 689, height: 605, chimneyX: 539, chimneyY: 0 },
] as const;
export const plantArt = loadArt('plants', ...ATLAS_LAYOUT.plants, true);
export const wardrobeArt = loadArt('wardrobe', ...ATLAS_LAYOUT.wardrobe, true);
export const innkeeperArt = loadArt('innkeeper', ...ATLAS_LAYOUT.innkeeper, true);
export const animalArt = loadArt('animals', ...ATLAS_LAYOUT.animals, true);
export const bearArt = loadArt('bear-cub', ...ATLAS_LAYOUT.bear, true);
export const effectsArt = loadArt('effects', ...ATLAS_LAYOUT.effects);
export const pickupArt = loadArt('pickups', ...ATLAS_LAYOUT.pickups);
export const terrainArt = new Image();
terrainArt.src = artUrl('terrain');
const terrainTiles = new Map<string, HTMLCanvasElement>();
export function terrainTile(column: number, size: number = TERRAIN_LAYOUT.tileSize) {
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
    const width = terrainArt.naturalWidth / TERRAIN_LAYOUT.columns;
    // Crossfade overlapping edges without mirroring the asymmetric scatter.
    // The first/last pixels share a sample, including at four-tile corners.
    const overlap = Math.max(1, Math.round(size / TERRAIN_LAYOUT.overlapDivisor));
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
        const a = (y * source.width + x) * TERRAIN_LAYOUT.rgbaChannels;
        const b = (y * source.width + x + (blendX ? span : 0)) * TERRAIN_LAYOUT.rgbaChannels;
        const c = ((y + (blendY ? span : 0)) * source.width + x) * TERRAIN_LAYOUT.rgbaChannels;
        const d = c + (blendX ? span * TERRAIN_LAYOUT.rgbaChannels : 0);

        for (let channel = 0; channel < TERRAIN_LAYOUT.rgbaChannels; channel++) {
          output.data[(y * size + x) * TERRAIN_LAYOUT.rgbaChannels + channel] =
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
  cell = DEFAULT_ART_CELL,
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

export const gatheredArt = loadArt('gathered', ...ATLAS_LAYOUT.gathered);
