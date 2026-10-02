import { ARENA, onPath } from "@emberfall/common";

/** Ninja Adventure's dark grass/dirt autotile, drawn at the buildings' 2x scale. */
export function drawVillagePaths(ctx: CanvasRenderingContext2D, floor: HTMLImageElement) {
  if (!floor.naturalWidth) return;
  const size = 32;
  const dirt = (x: number, y: number) =>
    x >= 0 &&
    y >= 0 &&
    x < ARENA.width / size &&
    y < ARENA.height / size &&
    onPath(x * size + size / 2, y * size + size / 2, 24);
  for (let y = 0; y < ARENA.height / size; y++) {
    for (let x = 0; x < ARENA.width / size; x++) {
      if (!dirt(x, y)) continue;
      // Each quadrant chooses an outer edge, dirt center, or concave grass corner.
      for (const dy of [-1, 1]) {
        for (const dx of [-1, 1]) {
          const horizontal = dirt(x + dx, y);
          const vertical = dirt(x, y + dy);
          const qx = dx < 0 ? 0 : 8;
          const qy = dy < 0 ? 0 : 8;
          const inner = horizontal && vertical && !dirt(x + dx, y + dy);
          const sx = inner ? 256 + 8 - qx : 192 + (horizontal ? 0 : dx * 16) + qx;
          const sy = inner ? 128 + 8 - qy : 128 + (vertical ? 0 : dy * 16) + qy;
          ctx.drawImage(floor, sx, sy, 8, 8, x * size + qx * 2, y * size + qy * 2, 16, 16);
        }
      }
    }
  }
}
