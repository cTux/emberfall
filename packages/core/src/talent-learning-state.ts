import type { Progress } from './progress.ts';
import { availableTalentPoints } from './available-talent-points.ts';
import { TALENT_TREE } from './talent-tree-nodes.ts';
import { talentRank } from './talent-rank.ts';
import { canLearnNode } from './can-learn-node.ts';

/** Present the whole class tree using one point-budget scan and the authoritative eligibility rule. */
export function talentLearningState(progress: Progress) {
  const points = availableTalentPoints(progress);

  return {
    points,
    nodes: TALENT_TREE.filter((node) => {
      return node.classId === (progress.classId ?? 'warrior');
    }).map((node) => {
      const rank = talentRank(progress, node.id);

      return {
        ...node,
        rank,
        learned: rank > 0,
        available: points > 0 && canLearnNode(progress, node),
      };
    }),
  };
}
