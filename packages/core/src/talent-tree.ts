import type { CharacterProgress } from '@emberfall/common';
import { TALENT_LEVELS, TALENT_NAMES, talentNodeId } from './talent-catalog.ts';
export { TALENT_LEVELS, TALENT_NAMES, TALENT_COLUMNS, talentNodeId } from './talent-catalog.ts';
export type TalentKind = 'ability' | 'extension';
export interface TalentNode {
  id: string;
  kind: TalentKind;
  classId: string;
  column: number;
  row: number;
  level: number;
  name: string;
  slot?: number;
}
export const TALENT_TREE: readonly Readonly<TalentNode>[] = Object.freeze(
  Object.entries(TALENT_NAMES).flatMap(([classId, columns]) =>
    columns.flatMap((names, column) =>
      names.map((name, row) =>
        Object.freeze({
          id: talentNodeId(classId, column, row),
          classId,
          column,
          row,
          name,
          level: TALENT_LEVELS[row],
          kind: [1, 3, 5, 7].includes(row) ? ('ability' as const) : ('extension' as const),
          ...([1, 3, 5, 7].includes(row) ? { slot: column * 4 + (row - 1) / 2 } : {}),
        }),
      ),
    ),
  ),
);
const nodesById = new Map(TALENT_TREE.map((node) => [node.id, node]));
type Progress = Pick<CharacterProgress, 'level' | 'talents'> & { classId?: string };
export function talentRank(progress: Pick<CharacterProgress, 'talents'>, id: string) {
  const value = progress.talents?.[id];

  return nodesById.has(id) && Number.isInteger(value) && value! > 0 && value! <= 2 ? value! : 0;
}

export function isTalentLearned(progress: Pick<CharacterProgress, 'talents'>, id: string) {
  return talentRank(progress, id) > 0;
}

export function availableTalentPoints(progress: Progress) {
  const spent = TALENT_TREE.reduce((sum, node) => sum + talentRank(progress, node.id), 0);

  return Math.max(0, Math.min(20, progress.level) - spent);
}

export function canLearnTalent(progress: Progress, id: string) {
  const node = nodesById.get(id);

  return (
    !!node &&
    node.classId === (progress.classId ?? 'warrior') &&
    progress.level >= node.level &&
    talentRank(progress, id) < 2 &&
    availableTalentPoints(progress) > 0
  );
}

export function learnTalent(progress: Progress, id: string) {
  if (!canLearnTalent(progress, id))
    throw new Error('Talent is locked, fully ranked, or no points remain.');
  progress.talents = { ...progress.talents, [id]: talentRank(progress, id) + 1 };
}

export const TALENT_RESET_COST = 50;
export function resetTalents(
  progress: Pick<CharacterProgress, 'talents' | 'coins' | 'talentSlots'>,
) {
  if (!TALENT_TREE.some((node) => isTalentLearned(progress, node.id)))
    throw new Error('You have no talent points to reset.');
  if ((progress.coins ?? 0) < TALENT_RESET_COST)
    throw new Error(`You need ${TALENT_RESET_COST} coins to reset your talent points.`);
  progress.talents = {};
  progress.talentSlots = [null, null, null, null];
  progress.coins = (progress.coins ?? 0) - TALENT_RESET_COST;
}

/** A versioned, idempotent migration refunds old trees and repairs invalid budgets. */
export function normalizeTalents(progress: CharacterProgress, classId: string) {
  const valid =
    progress.talentVersion === 2 &&
    Object.entries(progress.talents ?? {}).every(([id, rank]) => {
      const node = nodesById.get(id);

      return (
        !!node &&
        node.classId === classId &&
        node.level <= progress.level &&
        Number.isInteger(rank) &&
        rank >= 1 &&
        rank <= 2
      );
    }) &&
    TALENT_TREE.reduce((sum, node) => sum + talentRank(progress, node.id), 0) <=
      Math.min(20, progress.level);
  if (!valid) {
    progress.talents = {};
    progress.talentSlots = [null, null, null, null];
  }

  progress.talentVersion = 2;
  progress.talentSlots = Array.from({ length: 4 }, (_, index) => {
    const id = progress.talentSlots?.[index];
    const node = id ? nodesById.get(id) : undefined;

    return node?.kind === 'ability' && node.classId === classId && talentRank(progress, node.id) > 0
      ? node.id
      : null;
  });
}

export function equipTalent(
  progress: Progress & Pick<CharacterProgress, 'talentSlots'>,
  slot: number,
  nodeId: string | null,
) {
  const node = nodeId ? nodesById.get(nodeId) : undefined;
  if (
    !Number.isInteger(slot) ||
    slot < 0 ||
    slot > 3 ||
    (nodeId !== null &&
      (!node ||
        node.kind !== 'ability' ||
        node.classId !== (progress.classId ?? 'warrior') ||
        !isTalentLearned(progress, nodeId)))
  )
    throw new Error('Choose a learned ability for this slot.');
  progress.talentSlots = Array.from({ length: 4 }, (_, index) =>
    index === slot ? nodeId : (progress.talentSlots?.[index] ?? null),
  );
}
