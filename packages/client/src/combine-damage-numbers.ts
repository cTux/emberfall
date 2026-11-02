import { DAMAGE_TEXT } from './damage-text-tuning.ts';
import type { DamageEvent } from '@emberfall/common';

// Existing combat-label calibration gives each number a fixed 750 ms flight and short initial pop.

/** Fixed windows prevent a rapid stream of hits from extending a number forever. */
export function combineDamageNumbers(hits: readonly DamageEvent[]): DamageEvent[] {
  const totals: DamageEvent[] = [];
  const latest = new Map<string, DamageEvent>();

  for (const hit of [...hits].sort((a, b) => {
    return a.at - b.at;
  })) {
    const key = JSON.stringify([hit.ownerId, hit.target, hit.damageType ?? 'physical']);
    const previous = hit.ownerId ? latest.get(key) : undefined;

    if (previous && hit.at - previous.at <= DAMAGE_TEXT.mergeWindowMs) {
      previous.amount += hit.amount;
      previous.critical = previous.critical || hit.critical;
    } else {
      const total = { ...hit };
      totals.push(total);

      if (hit.ownerId) {
        latest.set(key, total);
      }
    }
  }

  return totals;
}
