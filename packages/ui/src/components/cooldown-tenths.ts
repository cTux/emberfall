import { COOLDOWN_TIME } from './cooldown-time.ts';

export function cooldownTenths(milliseconds: number) {
  return Math.round(milliseconds / COOLDOWN_TIME.tenthMs) / COOLDOWN_TIME.tenthsPerSecond;
}
