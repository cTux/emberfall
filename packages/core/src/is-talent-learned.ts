import { talentRank } from './talent-rank.ts';
import type { CharacterProgress } from '@emberfall/core/contracts';

export function isTalentLearned(progress: Pick<CharacterProgress, 'talents'>, id: string) {
  return talentRank(progress, id) > 0;
}
