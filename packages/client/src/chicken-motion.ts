// Existing decorative chicken reactions use hysteresis (70px start/100px stop) so a nearby player does not toggle panic every frame.
export const CHICKEN_MOTION = {
  maxStepMs: 100,
  panicExitRadius: 100,
  panicEnterRadius: 70,
  fleeSpeed: 80,
  returnSpeed: 10,
  facingEpsilon: 1e-6,
  panicStepMs: 70,
  walkingStepMs: 180,
  walkFrames: 3,
  movingThreshold: 0.5,
} as const;
