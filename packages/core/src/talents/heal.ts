import type { Player } from '@emberfall/common';
import { applyHealing } from '../combat/meters.ts';

type HealingTarget = Pick<Player, 'x' | 'y' | 'hitpoints' | 'maxHitpoints'>;

export function heal(player: HealingTarget, fraction: number, owner: Player, now: number) {
  applyHealing(player, player.maxHitpoints * fraction, owner, now);
}
