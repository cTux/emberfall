import type { Progress } from './progress.ts';
import { TALENT_TREE } from './talent-tree-nodes.ts';
import { talentRank } from './talent-rank.ts';
import { TALENT_POINT_CAP } from './talent-catalog.ts';

export function availableTalentPoints(progress: Progress) {
  const spent = TALENT_TREE.reduce((sum, node) => {
    return sum + talentRank(progress, node.id);
  }, 0);

  return Math.max(0, Math.min(TALENT_POINT_CAP, progress.level) - spent);
}
