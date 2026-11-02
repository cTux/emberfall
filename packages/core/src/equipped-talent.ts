import type { Player } from '@emberfall/common';
import { TALENT_TREE } from './talent-tree.ts';

export function equippedTalent(player: Player, slot: number) {
  return TALENT_TREE.find((node) => {
    return (
      node.id === player.talentSlots?.[slot] &&
      node.classId === (player.classId ?? 'warrior') &&
      node.kind === 'ability'
    );
  });
}
