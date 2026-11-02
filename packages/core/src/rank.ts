import type { Player } from '@emberfall/core/contracts';
import { talentRank, talentNodeId } from './talent-tree.ts';

// Preserve the existing talent-ailment balance and tooltip contract; the original
// calibration of these chances, caps, radii and durations is undocumented.

export function rank(player: Player, column: number, row: number) {
  return talentRank(player, talentNodeId(player.classId ?? 'warrior', column, row));
}
