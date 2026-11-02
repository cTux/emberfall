import type { Container, Matrix } from 'pixi.js';

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
