import type { Progress } from './progress.ts';
import { canLearnNode } from './can-learn-node.ts';
import { nodesById } from './nodes-by-id.ts';
import { availableTalentPoints } from './available-talent-points.ts';

export function canLearnTalent(progress: Progress, id: string) {
  return canLearnNode(progress, nodesById.get(id)) && availableTalentPoints(progress) > 0;
}
