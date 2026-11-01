// Atlas facing IDs must remain aligned with the packaged down/up/left/right columns.
const FACING = { left: 2, right: 3 } as const;
// Existing dead-zone and 10% diagonal hysteresis prevent noisy sprite flips near a direction boundary.
const FACING_STABILITY = { idleEpsilon: 0.0001, diagonalRatio: 0.1 } as const;

/** Keep the current valid axis near diagonals; floating-point noise must not flip sprites. */
export function movementFacing(x: number, y: number, previous: number) {
  const ax = Math.abs(x),
    ay = Math.abs(y);

  if (Math.max(ax, ay) < FACING_STABILITY.idleEpsilon) {
    return previous;
  }

  const horizontal = x < 0 ? FACING.left : FACING.right,
    vertical = y < 0 ? 1 : 0;

  if (Math.abs(ax - ay) <= Math.max(ax, ay) * FACING_STABILITY.diagonalRatio) {
    if (previous === horizontal || previous === vertical) {
      return previous;
    }

    return horizontal;
  }

  return ax > ay ? horizontal : vertical;
}
