import type { CharacterProgress } from '@emberfall/common';
import {
  TALENT_LEVELS,
  TALENT_NAMES,
  talentNodeId,
  TALENT_ABILITY_ROWS,
  TALENT_ABILITIES_PER_COLUMN,
  TALENT_MAX_RANK,
  TALENT_ACTION_SLOTS,
  TALENT_POINT_CAP,
  TALENT_VERSION,
} from './talent-catalog.ts';
export {
  TALENT_LEVELS,
  TALENT_NAMES,
  TALENT_COLUMNS,
  TALENT_POINT_CAP,
  talentNodeId,
} from './talent-catalog.ts';
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
  Object.entries(TALENT_NAMES).flatMap(([classId, columns]) => {
    return columns.flatMap((names, column) => {
      return names.map((name, row) => {
        return Object.freeze({
          id: talentNodeId(classId, column, row),
          classId,
          column,
          row,
          name,
          level: TALENT_LEVELS[row],
          kind: TALENT_ABILITY_ROWS.includes(row) ? ('ability' as const) : ('extension' as const),
          ...(TALENT_ABILITY_ROWS.includes(row)
            ? { slot: column * TALENT_ABILITIES_PER_COLUMN + (row - 1) / 2 }
            : {}),
        });
      });
    });
  }),
);
const nodesById = new Map(
  TALENT_TREE.map((node) => {
    return [node.id, node];
  }),
);
type Progress = Pick<CharacterProgress, 'level' | 'talents'> & { classId?: string };
export function talentRank(progress: Pick<CharacterProgress, 'talents'>, id: string) {
  const value = progress.talents?.[id];

  return nodesById.has(id) && Number.isInteger(value) && value! > 0 && value! <= TALENT_MAX_RANK
    ? value!
    : 0;
}

export function isTalentLearned(progress: Pick<CharacterProgress, 'talents'>, id: string) {
  return talentRank(progress, id) > 0;
}

export function availableTalentPoints(progress: Progress) {
  const spent = TALENT_TREE.reduce((sum, node) => {
    return sum + talentRank(progress, node.id);
  }, 0);

  return Math.max(0, Math.min(TALENT_POINT_CAP, progress.level) - spent);
}

function canLearnNode(progress: Progress, node: Readonly<TalentNode> | undefined) {
  return (
    !!node &&
    node.classId === (progress.classId ?? 'warrior') &&
    progress.level >= node.level &&
    talentRank(progress, node.id) < TALENT_MAX_RANK
  );
}

export function canLearnTalent(progress: Progress, id: string) {
  return canLearnNode(progress, nodesById.get(id)) && availableTalentPoints(progress) > 0;
}

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

export function learnTalent(progress: Progress, id: string) {
  if (!canLearnTalent(progress, id)) {
    throw new Error('Talent is locked, fully ranked, or no points remain.');
  }

  progress.talents = { ...progress.talents, [id]: talentRank(progress, id) + 1 };
}

// PROG-03 fixes the optional respec price at 50 coins; retain the established economy cost.
export const TALENT_RESET_COST = 50;
export function resetTalents(
  progress: Pick<CharacterProgress, 'talents' | 'coins' | 'talentSlots'>,
) {
  if (
    !TALENT_TREE.some((node) => {
      return isTalentLearned(progress, node.id);
    })
  ) {
    throw new Error('You have no talent points to reset.');
  }

  if ((progress.coins ?? 0) < TALENT_RESET_COST) {
    throw new Error(`You need ${TALENT_RESET_COST} coins to reset your talent points.`);
  }

  progress.talents = {};
  progress.talentSlots = [null, null, null, null];
  progress.coins = (progress.coins ?? 0) - TALENT_RESET_COST;
}

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
