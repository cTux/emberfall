import { DAMAGE_TEXT } from './damage-text-tuning.ts';
import type { DamageEvent } from '@emberfall/common';

// Existing combat-label calibration gives each number a fixed 750 ms flight and short initial pop.

/** Stateless animation survives snapshot replacement without replaying a hit. */
export function damageTextFrame(hit: DamageEvent, now: number) {
  const age = now - hit.at;

  if (age < 0 || age >= DAMAGE_TEXT.lifetimeMs) {
    return undefined;
  }

  const progress = age / DAMAGE_TEXT.lifetimeMs;
  const rise = 1 - (1 - progress) ** 2;
  const lane =
    (((hit.id % DAMAGE_TEXT.lanes) + DAMAGE_TEXT.lanes) % DAMAGE_TEXT.lanes) -
    DAMAGE_TEXT.centerLane;
  const pop =
    age < DAMAGE_TEXT.popMs
      ? DAMAGE_TEXT.initialScale + (age / DAMAGE_TEXT.popMs) * DAMAGE_TEXT.popGrowth
      : 1 +
        DAMAGE_TEXT.settleScale * Math.max(0, 1 - (age - DAMAGE_TEXT.popMs) / DAMAGE_TEXT.settleMs);

  return {
    x: lane * (DAMAGE_TEXT.laneGap + rise * DAMAGE_TEXT.laneSpread),
    y: -DAMAGE_TEXT.rise - rise * DAMAGE_TEXT.rise,
    scale: pop,
    alpha: age <= DAMAGE_TEXT.fadeAtMs ? 1 : (DAMAGE_TEXT.lifetimeMs - age) / DAMAGE_TEXT.fadeMs,
  };
}
