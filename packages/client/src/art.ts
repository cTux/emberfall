import { clientAsset } from './urls.ts';
import { ACTOR_CELL } from './animation';
import { softenArtTones } from './art-tones';

export const artUrl = (name: string) => clientAsset(`/assets/wardrobe-style/${name}.png`);
export const artImages: HTMLImageElement[] = [];
const loadedArt = new Map<string, HTMLImageElement>();

function softenAtlas(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  softenArtTones(image.data, image.width, image.height);
  ctx.putImageData(image, 0, 0);
}

/** Source-sheet corrections, baked once rather than mirroring actors at runtime.
 * Facing down: anatomical right is screen-left; facing up: screen-right.
 * Side views are distinct: the right arm is far when facing left, near when right.
 */
function actorOrientation(name: string, row: number, col: number) {
  const flip =
    (col === 0 && (['caster', 'warden'].includes(name) || (name === 'brute' && row !== 6))) ||
    (col === 1 && ((name === 'caster' && row === 6) || (name === 'warden' && row !== 5))) ||
    (col === 2 && name === 'caster');
  return { col, flip };
}

/** Load art once. The returned image becomes ready only after atlas packaging. */
export function loadArt(name: string, columns = 1, rows = 1, cell = 64, actor = false) {
  const key = `${name}:${columns}:${rows}:${cell}:${actor}`;
  const cached = loadedArt.get(key);
  if (cached) return cached;
  const result = new Image();
  const resolution = actor ? 2 : 1;
  result.dataset.artResolution = String(resolution);
  loadedArt.set(key, result);
  const source = new Image();
  artImages.push(result);
  source.onload = async () => {
    const input = document.createElement('canvas');
    input.width = source.naturalWidth;
    input.height = source.naturalHeight;
    const inputContext = input.getContext('2d', { willReadFrequently: true })!;
    inputContext.drawImage(source, 0, 0);
    const pixels = inputContext.getImageData(0, 0, input.width, input.height).data;
    // Some generated sheets contain three walking poses. Explicit row boundaries
    // preserve the approved art rather than pretending it has an exact grid.
    const custom: Record<string, number[]> = {
      warrior: [0, 225, 450, 671, 890, 1108, 1342, 1576, 1774],
      ranger: [0, 237, 453, 675, 897, 1106, 1320, 1566, 1774],
      mage: [0, 228, 442, 658, 887, 1112, 1333, 1580, 1774],
      skeleton: [0, 253, 459, 664, 877, 1074, 1323, 1558, 1774],
      brute: [0, 225, 444, 664, 884, 1100, 1359, 1577, 1774],
      druid: [0, 239, 447, 660, 880, 1180, 1500, 1774],
      runner: [0, 265, 490, 730, 950, 1160, 1410, 1774],
      caster: [0, 235, 460, 665, 885, 1130, 1400, 1774],
      warden: [0, 206, 397, 594, 782, 978, 1223, 1500, 1774],
      environment: [0, 477, 872, 1254],
      animals: [0, 335, 566, 794, 1034, 1293, 1536],
      effects: [0, 380, 740, 1000, 1254],
    };
    const boundaries = custom[name];
    const rowMap =
      boundaries?.length === 8 && rows === 8
        ? [0, 1, 2, 3, 2, 4, 5, 6]
        : Array.from({ length: rows }, (_, i) => i);
    const frames = rowMap.flatMap((row) =>
      Array.from({ length: columns }, (_, col) => {
        const sourceColumns =
          name === 'plants' ? [0, 440, 845, 1230, 1615, 2048] : [0, 309, 535, 735, 1024];
        const sourceWidth = sourceColumns.at(-1)!;
        const x0 = ['animals', 'plants'].includes(name)
          ? Math.round((sourceColumns[col] * input.width) / sourceWidth)
          : Math.round((col * input.width) / columns);
        const x1 = ['animals', 'plants'].includes(name)
          ? Math.round((sourceColumns[col + 1] * input.width) / sourceWidth)
          : Math.round(((col + 1) * input.width) / columns);
        const y0 = boundaries
          ? (boundaries[row] * input.height) / boundaries.at(-1)!
          : Math.round((row * input.height) / rows);
        const y1 = boundaries
          ? (boundaries[row + 1] * input.height) / boundaries.at(-1)!
          : Math.round(((row + 1) * input.height) / rows);
        let left = x1,
          top = y1,
          right = x0,
          bottom = y0;
        for (let y = Math.floor(y0); y < Math.floor(y1); y++)
          for (let x = x0; x < x1; x++) {
            if (pixels[(y * input.width + x) * 4 + 3] < 32) continue;
            left = Math.min(left, x);
            right = Math.max(right, x + 1);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y + 1);
          }
        return { left, top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
      }),
    );
    const maxHeight = Math.max(...frames.map((f) => f.height));
    const maxWidth = Math.max(...frames.map((f) => f.width));
    const scale = Math.min((cell - 4) / maxWidth, (cell - 6) / maxHeight);
    const output = document.createElement('canvas');
    output.width = columns * cell * resolution;
    output.height = rows * cell * resolution;
    const ctx = output.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.scale(resolution, resolution);
    frames.forEach((_, i) => {
      const row = Math.floor(i / columns),
        col = i % columns;
      const orientation = actorOrientation(name, row, col);
      const f = frames[row * columns + orientation.col];
      const standing = ['warrior', 'ranger', 'mage', 'druid'].includes(name) && i < columns * 5;
      const frameScale =
        name === 'environment'
          ? Math.min((cell - 4) / f.width, (cell - 6) / f.height)
          : standing
            ? Math.min(
                (cell - 4) / f.width,
                (name === 'druid' ? 58 : 52) /
                  Math.max(...frames.slice(0, columns * 5).map((f) => f.height)),
              )
            : scale;
      const width = Math.max(1, Math.round(f.width * frameScale));
      const height = Math.max(1, Math.round(f.height * frameScale));
      ctx.save();
      ctx.translate(col * cell + cell / 2, row * cell);
      if (orientation.flip) ctx.scale(-1, 1);
      ctx.drawImage(
        source,
        f.left,
        f.top,
        f.width,
        f.height,
        -width / 2,
        actor ? cell - 3 - height : Math.round((cell - height) / 2),
        width,
        height,
      );
      ctx.restore();
    });
    if (actor) softenAtlas(output);
    result.src = output.toDataURL();
    result.dataset.artReady = 'true';
  };
  source.src = artUrl(name);
  return result;
}

export const actorArt = (name: string) => {
  if (!['warrior', 'ranger', 'mage', 'druid'].includes(name))
    return loadArt(name, 4, 8, ACTOR_CELL, true);
  const key = `${name}:player-atlas`;
  const cached = loadedArt.get(key);
  if (cached) return cached;
  const image = new Image();
  image.dataset.artResolution = '2';
  loadedArt.set(key, image);
  artImages.push(image);
  const source = new Image();
  source.onload = () => {
    const output = document.createElement('canvas');
    output.width = source.naturalWidth;
    output.height = source.naturalHeight;
    output.getContext('2d')!.drawImage(source, 0, 0);
    softenAtlas(output);
    image.src = output.toDataURL();
    image.dataset.artReady = 'true';
  };
  source.src = artUrl(`${name}-atlas`);
  return image;
};
export const environmentArt = loadArt('environment', 3, 3, 128, true);
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
  if (cached) return cached;
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
        for (let channel = 0; channel < 4; channel++)
          output.data[(y * size + x) * 4 + channel] =
            (pixels[a + channel] * (1 - blendX) + pixels[b + channel] * blendX) * (1 - blendY) +
            (pixels[c + channel] * (1 - blendX) + pixels[d + channel] * blendX) * blendY;
      }
    }
    ctx.putImageData(output, 0, 0);
    terrainTiles.set(key, tile);
  }
  return tile;
}
export function drawArt(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  column: number,
  row: number,
  x: number,
  y: number,
  width: number,
  height: number,
  cell = 64,
) {
  if (!image.naturalWidth || image.dataset.artReady !== 'true') return;
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
