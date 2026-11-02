import type { Matrix, Rectangle } from 'pixi.js';

export function transformedBounds(
  m: Matrix,
  bounds: Rectangle,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const ax = m.a * width,
    bx = m.c * height,
    ay = m.b * width,
    by = m.d * height;
  bounds.x = m.a * x + m.c * y + m.tx + Math.min(0, ax) + Math.min(0, bx);
  bounds.y = m.b * x + m.d * y + m.ty + Math.min(0, ay) + Math.min(0, by);
  bounds.width = Math.abs(ax) + Math.abs(bx);
  bounds.height = Math.abs(ay) + Math.abs(by);

  return bounds;
}
