import type { Progress } from './progress.ts';
import { canLearnTalent } from './can-learn-talent.ts';
import { talentRank } from './talent-rank.ts';

export function learnTalent(progress: Progress, id: string) {
  if (!canLearnTalent(progress, id)) {
    throw new Error('Talent is locked, fully ranked, or no points remain.');
  }

  progress.talents = { ...progress.talents, [id]: talentRank(progress, id) + 1 };
}
