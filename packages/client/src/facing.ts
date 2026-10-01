/** Keep the current valid axis near diagonals; floating-point noise must not flip sprites. */
export function movementFacing(x: number, y: number, previous: number) {
  const ax = Math.abs(x),
    ay = Math.abs(y);
  if (Math.max(ax, ay) < 0.0001) return previous;
  const horizontal = x < 0 ? 2 : 3,
    vertical = y < 0 ? 1 : 0;
  if (Math.abs(ax - ay) <= Math.max(ax, ay) * 0.1) {
    if (previous === horizontal || previous === vertical) return previous;
    return horizontal;
  }
  return ax > ay ? horizontal : vertical;
}
