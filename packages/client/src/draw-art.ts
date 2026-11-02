import type { DrawingContext } from './rendering/drawing-context';

// Most packaged art uses logical 64-pixel cells; high-resolution images retain this logical coordinate grid.
const DEFAULT_ART_CELL = 64;

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
