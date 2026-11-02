import { recordCombatTotal } from './record-combat-total.ts';
import type { Player } from '@emberfall/common';

export function applyHealing(
  target: Pick<Player, 'hitpoints' | 'maxHitpoints'>,
  amount: number,
  owner: Player,
  now: number,
) {
  const before = target.hitpoints;
  target.hitpoints = Math.min(target.maxHitpoints, target.hitpoints + amount);
  recordCombatTotal(owner, 'healingMeter', target.hitpoints - before, now);
}
