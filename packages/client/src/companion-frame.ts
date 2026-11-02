import { BEAR_ART } from './bear-art.ts';
import type { Bear } from '@emberfall/core/contracts';
import { PLAYER_ATTACK_DURATION } from '@emberfall/core';

export function companionFrame(bear: Bear, now: number) {
  const age = now - (bear.attackAt ?? -Infinity);

  return {
    column:
      bear.hitpoints <= 0
        ? BEAR_ART.fallenFrame
        : age >= 0 && age < PLAYER_ATTACK_DURATION
          ? age < PLAYER_ATTACK_DURATION / 2
            ? BEAR_ART.windupFrame
            : BEAR_ART.releaseFrame
          : bear.moving
            ? 1 + (Math.floor(now / BEAR_ART.stepMs) % BEAR_ART.walkFrames)
            : 0,
    left: Math.cos(bear.attackAngle ?? 0) < 0,
  };
}
