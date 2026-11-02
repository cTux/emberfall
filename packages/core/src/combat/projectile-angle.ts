import { ATTACK_DEFINITIONS } from '../definitions/abilities/attacks.ts';

export function projectileAngle(
  aimAngle: number,
  index: number,
  count: number,
  spread = ATTACK_DEFINITIONS.arrow.spreadRadians,
) {
  return aimAngle + (index - (count - 1) / 2) * spread;
}
