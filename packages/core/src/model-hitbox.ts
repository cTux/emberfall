import { COLLISION } from './definitions/collision.ts';

/** Center and radius of the rendered actor model, excluding weapons and effects. */
// Seven sixteenths places the model center above its feet while retaining a half-size radius.
const MODEL_CENTER_OFFSET = {
  numerator: 7,
  denominator: 16,
} as const;
// Existing fallback matches the forty-eight-pixel actor art when a caller omits its size.
const DEFAULT_MODEL_SIZE = 48;
export function modelHitbox(
  actor: {
    x: number;
    y: number;
    size?: number;
  },
  size = actor.size ?? DEFAULT_MODEL_SIZE,
) {
  return {
    x: actor.x,
    y:
      actor.y +
      COLLISION.feetOffset -
      (size * MODEL_CENTER_OFFSET.numerator) / MODEL_CENTER_OFFSET.denominator,
    radius: size / 2,
  };
}
