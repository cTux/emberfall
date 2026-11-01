import type { DrawingContext } from './rendering/drawing-context';
// A seven-pixel bar preserves five fill pixels inside its one-pixel border at world scale.

const WORLD_BAR_HEIGHT = 7;
const BORDER = 1;

export function drawWorldBar(
  ctx: DrawingContext,
  left: number,
  bottom: number,
  width: number,
  fraction: number,
  color: string,
) {
  ctx.fillStyle = '#28271b';
  ctx.fillRect(left, bottom - WORLD_BAR_HEIGHT, width, WORLD_BAR_HEIGHT);
  ctx.fillStyle = '#695a31';
  ctx.fillRect(
    left + BORDER,
    bottom - WORLD_BAR_HEIGHT + BORDER,
    width - BORDER * 2,
    WORLD_BAR_HEIGHT - BORDER * 2,
  );
  ctx.fillStyle = color;
  ctx.fillRect(
    left + BORDER,
    bottom - WORLD_BAR_HEIGHT + BORDER,
    (width - BORDER * 2) * Math.max(0, Math.min(1, fraction)),
    WORLD_BAR_HEIGHT - BORDER * 2,
  );
}
