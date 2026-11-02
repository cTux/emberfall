import { TALENT_TREE } from './talent-tree-nodes.ts';
import { isTalentLearned } from './is-talent-learned.ts';
import { TALENT_RESET_COST } from './talent-reset-cost.ts';
import type { CharacterProgress } from '@emberfall/core/contracts';

export function resetTalents(
  progress: Pick<CharacterProgress, 'talents' | 'coins' | 'talentSlots'>,
) {
  if (
    !TALENT_TREE.some((node) => {
      return isTalentLearned(progress, node.id);
    })
  ) {
    throw new Error('You have no talent points to reset.');
  }

  if ((progress.coins ?? 0) < TALENT_RESET_COST) {
    throw new Error(`You need ${TALENT_RESET_COST} coins to reset your talent points.`);
  }

  progress.talents = {};
  progress.talentSlots = [null, null, null, null];
  progress.coins = (progress.coins ?? 0) - TALENT_RESET_COST;
}
