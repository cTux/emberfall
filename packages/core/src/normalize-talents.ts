import { nodesById } from './nodes-by-id.ts';
import { TALENT_TREE } from './talent-tree-nodes.ts';
import { talentRank } from './talent-rank.ts';
import type { CharacterProgress } from '@emberfall/common';
import {
  TALENT_VERSION,
  TALENT_MAX_RANK,
  TALENT_POINT_CAP,
  TALENT_ACTION_SLOTS,
} from './talent-catalog.ts';

/** A versioned, idempotent migration refunds old trees and repairs invalid budgets. */
export function normalizeTalents(progress: CharacterProgress, classId: string) {
  const valid =
    progress.talentVersion === TALENT_VERSION &&
    Object.entries(progress.talents ?? {}).every(([id, rank]) => {
      const node = nodesById.get(id);

      return (
        !!node &&
        node.classId === classId &&
        node.level <= progress.level &&
        Number.isInteger(rank) &&
        rank >= 1 &&
        rank <= TALENT_MAX_RANK
      );
    }) &&
    TALENT_TREE.reduce((sum, node) => {
      return sum + talentRank(progress, node.id);
    }, 0) <= Math.min(TALENT_POINT_CAP, progress.level);

  if (!valid) {
    progress.talents = {};
    progress.talentSlots = [null, null, null, null];
  }

  progress.talentVersion = TALENT_VERSION;
  progress.talentSlots = Array.from({ length: TALENT_ACTION_SLOTS }, (_, index) => {
    const id = progress.talentSlots?.[index];
    const node = id ? nodesById.get(id) : undefined;

    return node?.kind === 'ability' && node.classId === classId && talentRank(progress, node.id) > 0
      ? node.id
      : null;
  });
}
