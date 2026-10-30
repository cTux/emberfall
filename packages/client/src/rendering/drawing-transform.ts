import type { Container, Matrix, Rectangle } from 'pixi.js';

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

export function applyTransform(
  object: Container,
  m: Matrix,
  scratch: Matrix,
  x: number,
  y: number,
  sx = 1,
  sy = 1,
) {
  const tx = m.a * x + m.c * y + m.tx;
  const ty = m.b * x + m.d * y + m.ty;
  if (m.b === 0 && m.c === 0 && m.a * sx >= 0 && m.d * sy >= 0) {
    object.position.set(tx, ty);
    object.scale.set(m.a * sx, m.d * sy);
    object.rotation = 0;
    object.skew.set(0, 0);
  } else {
    object.setFromMatrix(scratch.set(m.a * sx, m.b * sx, m.c * sy, m.d * sy, tx, ty));
  }
}
