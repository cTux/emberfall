import type { Player, Enemy } from '@emberfall/core/contracts';
import { attackTarget } from '../tactics.ts';

/** Shared wrapped target selection for cast scheduling, launch and prediction. */
export function nearestSpellTarget(
  player: { x: number; y: number } & Partial<Pick<Player, 'tactics' | 'attackTargetId'>>,
  enemies: Enemy[],
  range: number,
) {
  return attackTarget(player, enemies, range, player.tactics, player.attackTargetId);
}
