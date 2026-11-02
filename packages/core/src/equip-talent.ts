import type { Progress } from './progress.ts';
import { nodesById } from './nodes-by-id.ts';
import { isTalentLearned } from './is-talent-learned.ts';
import type { CharacterProgress } from '@emberfall/common';
import { TALENT_ACTION_SLOTS } from './talent-catalog.ts';

export function equipTalent(
  progress: Progress & Pick<CharacterProgress, 'talentSlots'>,
  slot: number,
  nodeId: string | null,
) {
  const node = nodeId ? nodesById.get(nodeId) : undefined;

  if (
    !Number.isInteger(slot) ||
    slot < 0 ||
    slot >= TALENT_ACTION_SLOTS ||
    (nodeId !== null &&
      (!node ||
        node.kind !== 'ability' ||
        node.classId !== (progress.classId ?? 'warrior') ||
        !isTalentLearned(progress, nodeId)))
  ) {
    throw new Error('Choose a learned ability for this slot.');
  }

  progress.talentSlots = Array.from({ length: TALENT_ACTION_SLOTS }, (_, index) => {
    return index === slot ? nodeId : (progress.talentSlots?.[index] ?? null);
  });
}
