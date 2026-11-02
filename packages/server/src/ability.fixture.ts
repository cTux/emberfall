import type { Player } from '@emberfall/common';
import { talentNodeId, learnTalent, equipTalent } from '@emberfall/core';

export function ability(player: Player, column: number, row: number, rank = 1) {
  const id = talentNodeId(player.classId!, column, row);

  for (let i = 0; i < rank; i++) {
    learnTalent(player, id);
  }

  equipTalent(player, 0, id);

  return id;
}
