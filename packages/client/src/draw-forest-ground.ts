import type { DrawingContext } from './rendering/drawing-context';
import { FOREST_VIEW } from './forest-calibration.ts';
// Preserve the legacy seeded fallback scatter until terrain PNGs finish loading.

/** Tile the same baked ground texture over the camera's world-space bounds. */
export function drawForestGround(
  ctx: DrawingContext,
  terrain: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  for (
    let row = Math.floor(y / FOREST_VIEW.tileSize);
    row <= (y + height) / FOREST_VIEW.tileSize;
    row++
  ) {
    for (
      let col = Math.floor(x / FOREST_VIEW.tileSize);
      col <= (x + width) / FOREST_VIEW.tileSize;
      col++
    ) {
      ctx.drawImage(terrain, col * FOREST_VIEW.tileSize, row * FOREST_VIEW.tileSize);
    }
  }
}
