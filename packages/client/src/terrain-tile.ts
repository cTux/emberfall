import { terrainArt } from './terrain-art.ts';

// Terrain PNGs contain three variants; a one-eighth overlap preserves the existing seamless edge crossfade.
const TERRAIN_LAYOUT = { tileSize: 320, columns: 3, overlapDivisor: 8, rgbaChannels: 4 } as const;

const terrainTiles = new Map<string, HTMLCanvasElement>();

export function terrainTile(
  column: number,
  size: number = TERRAIN_LAYOUT.tileSize,
  source: HTMLImageElement = terrainArt,
) {
  const terrainArt = source;
  const key = `${source.src}:${column}:${size}`;
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
