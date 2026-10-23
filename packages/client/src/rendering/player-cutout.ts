/** Game pixels, independent of backing resolution and graphics preset. */
export const PLAYER_CUTOUT_MARGIN = 10;
type Run = [x: number, y: number, width: number];
const silhouettes = new WeakMap<HTMLCanvasElement, Map<string, Run[]>>();

/** Rasterize only the small character pose, never a world frame. Cache entries
 * are owned by the existing pose masks and disappear with those masks. */
export function playerCutoutRuns(mask: HTMLCanvasElement, width: number, height: number) {
  const w = Math.ceil(width),
    h = Math.ceil(height),
    radius = PLAYER_CUTOUT_MARGIN;
  const key = `${w}:${h}`;
  let poses = silhouettes.get(mask);
  if (!poses) silhouettes.set(mask, (poses = new Map()));
  const cached = poses.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(mask, 0, 0, w, h);
  const pixels = ctx.getImageData(0, 0, w, h).data;
  const stride = w + radius * 2;
  const expanded = new Uint8Array(stride * (h + radius * 2));
  // Circular dilation, preserving the shape rather than its bounding rectangle.
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (pixels[(y * w + x) * 4 + 3] < 32) continue;
      for (let dy = -radius; dy <= radius; dy++) {
        const dx = Math.floor(Math.sqrt(radius * radius - dy * dy));
        const start = (y + radius + dy) * stride + x + radius;
        expanded.fill(1, start - dx, start + dx + 1);
      }
    }
  const runs: Run[] = [];
  for (let y = 0; y < h + radius * 2; y++)
    for (let x = 0; x < stride;) {
      if (!expanded[y * stride + x]) {
        x++;
        continue;
      }
      const start = x++;
      while (x < stride && expanded[y * stride + x]) x++;
      runs.push([start, y, x - start]);
    }
  poses.set(key, runs);
  return runs;
}
