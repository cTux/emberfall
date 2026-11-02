import { nodesById } from './nodes-by-id.ts';
import type { CharacterProgress } from '@emberfall/core/contracts';
import { TALENT_MAX_RANK } from './talent-catalog.ts';

export function talentRank(progress: Pick<CharacterProgress, 'talents'>, id: string) {
  const value = progress.talents?.[id];

  return nodesById.has(id) && Number.isInteger(value) && value! > 0 && value! <= TALENT_MAX_RANK
    ? value!
    : 0;
}
