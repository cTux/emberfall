import { ACTOR_CELL } from "./animation";

export const artUrl = (name: string) => `/assets/wardrobe-style/${name}.png`;
export const artImages: HTMLImageElement[] = [];
const loadedArt = new Map<string, HTMLImageElement>();

/** Source-sheet corrections, baked once rather than mirroring actors at runtime.
 * Facing down: anatomical right is screen-left; facing up: screen-right.
 * Side views are distinct: the right arm is far when facing left, near when right.
 */
function actorOrientation(name: string, row: number, col: number, walk = false) {
  if (name === "ranger" && col >= 2) return { col: 5 - col, flip: true };
  const flip =
    (col === 0 &&
      (["ranger", "mage", "druid", "caster", "warden"].includes(name) ||
        (name === "brute" && row !== 6))) ||
    (col === 1 &&
      !walk &&
      ((name === "druid" && row === 5) ||
        (name === "caster" && row === 6) ||
        (name === "warden" && row !== 5))) ||
    (col === 2 &&
      ((name === "mage" && (walk || row === 0)) ||
        (name === "druid" && !walk && row === 0) ||
        name === "caster"));
  return { col, flip };
}

/** Load art once. The returned image becomes ready only after atlas packaging. */
export function loadArt(name: string, columns = 1, rows = 1, cell = 64, actor = false) {
  const key = `${name}:${columns}:${rows}:${cell}:${actor}`;
  const cached = loadedArt.get(key);
  if (cached) return cached;
  const result = new Image();
  loadedArt.set(key, result);
  const source = new Image();
  artImages.push(result);
  source.onload = async () => {
    const input = document.createElement("canvas");
    input.width = source.naturalWidth;
    input.height = source.naturalHeight;
    const inputContext = input.getContext("2d", { willReadFrequently: true })!;
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
        const animalColumns = [0, 309, 535, 735, 1024];
        const x0 =
          name === "animals"
            ? Math.round((animalColumns[col] * input.width) / 1024)
            : Math.round((col * input.width) / columns);
        const x1 =
          name === "animals"
            ? Math.round((animalColumns[col + 1] * input.width) / 1024)
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
    const output = document.createElement("canvas");
    output.width = columns * cell;
    output.height = rows * cell;
    const ctx = output.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    frames.forEach((_, i) => {
      const row = Math.floor(i / columns),
        col = i % columns;
      const orientation = actorOrientation(name, row, col);
      const f = frames[row * columns + orientation.col];
      const standing = ["warrior", "ranger", "mage", "druid"].includes(name) && i < columns * 5;
      const frameScale =
        name === "environment"
          ? Math.min((cell - 4) / f.width, (cell - 6) / f.height)
          : standing
            ? Math.min(
                (cell - 4) / f.width,
                (name === "druid" ? 58 : 52) /
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
    if (["warrior", "ranger", "mage", "druid"].includes(name)) {
      const walk = new Image();
      walk.src = artUrl(`${name}-walk`);
      await walk.decode();
      input.width = walk.naturalWidth;
      input.height = walk.naturalHeight;
      inputContext.drawImage(walk, 0, 0);
      const data = inputContext.getImageData(0, 0, input.width, input.height).data;
      const stride = input.width / 4,
        step = input.height / 4;
      for (let row = 0; row < 4; row++)
        for (let col = 0; col < 4; col++) {
          const orientation = actorOrientation(name, row + 1, col, true);
          const sourceCol = orientation.col;
          let left = (sourceCol + 1) * stride,
            right = sourceCol * stride;
          let top = (row + 1) * step,
            bottom = row * step;
          for (let y = Math.floor(row * step); y < (row + 1) * step; y++)
            for (let x = Math.floor(sourceCol * stride); x < (sourceCol + 1) * stride; x++)
              if (data[(y * input.width + x) * 4 + 3] > 32) {
                left = Math.min(left, x);
                right = Math.max(right, x + 1);
                top = Math.min(top, y);
                bottom = Math.max(bottom, y + 1);
              }
          const height = name === "druid" ? 58 : 52;
          const width = Math.round(((right - left) * height) / (bottom - top));
          ctx.clearRect(col * cell, (row + 1) * cell, cell, cell);
          ctx.save();
          ctx.translate(col * cell + cell / 2, (row + 2) * cell - 3);
          if (orientation.flip) ctx.scale(-1, 1);
          ctx.drawImage(
            walk,
            left,
            top,
            right - left,
            bottom - top,
            -width / 2,
            -height,
            width,
            height,
          );
          ctx.restore();
        }
    }
    result.src = output.toDataURL();
    result.dataset.artReady = "true";
  };
  source.src = artUrl(name);
  return result;
}

export const actorArt = (name: string) => loadArt(name, 4, 8, ACTOR_CELL, true);
export const environmentArt = loadArt("environment", 3, 3, 128, true);
export const wardrobeArt = loadArt("wardrobe", 4, 1, 128, true);
export const animalArt = loadArt("animals", 4, 6, 64, true);
export const bearArt = loadArt("bear-cub", 4, 2, 64, true);
export const effectsArt = loadArt("effects", 4, 4, 128);
export const pickupArt = loadArt("pickups", 4, 3, 64);
export const terrainArt = new Image();
terrainArt.src = artUrl("terrain");
const terrainTiles = new Map<string, HTMLCanvasElement>();
export function terrainTile(column: number, size = 320) {
  const key = `${column}:${size}`;
  const cached = terrainTiles.get(key);
  if (cached) return cached;
  const tile = document.createElement("canvas");
  tile.width = tile.height = size;
  const ctx = tile.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  if (terrainArt.naturalWidth) {
    const width = terrainArt.naturalWidth / 3;
    // Preserve the irregular source texture: mirrored copies create visible
    // diamonds and repeated four-way tufts. 320 divides both wrapped axes.
    ctx.drawImage(terrainArt, column * width, 0, width, terrainArt.naturalHeight, 0, 0, size, size);
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
  if (!image.naturalWidth || image.dataset.artReady !== "true") return;
  ctx.drawImage(image, column * cell, row * cell, cell, cell, x, y, width, height);
}
