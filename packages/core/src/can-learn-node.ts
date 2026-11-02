import type { Progress } from './progress.ts';
import type { TalentNode } from './talent-node.ts';
import { talentRank } from './talent-rank.ts';
import { TALENT_MAX_RANK } from './talent-catalog.ts';

export function canLearnNode(progress: Progress, node: Readonly<TalentNode> | undefined) {
  return (
    !!node &&
    node.classId === (progress.classId ?? 'warrior') &&
    progress.level >= node.level &&
    talentRank(progress, node.id) < TALENT_MAX_RANK
  );
}
