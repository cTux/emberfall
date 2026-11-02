import { ATTACK_DEFINITIONS } from '../definitions/abilities/attacks.ts';

/** Frame-rate independent aim smoothing, always taking the shortest turn across ±pi. */
export function smoothAttackAngle(
  current: number | undefined,
  target: number,
  dt: number,
  smoothingSeconds = ATTACK_DEFINITIONS.slash.aimSmoothingSeconds,
) {
  if (current === undefined) {
    return target;
  }

  const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  const angle = current + difference * (1 - Math.exp(-Math.max(0, dt) / smoothingSeconds));

  return Math.atan2(Math.sin(angle), Math.cos(angle));
}
