import type { TalentNode } from './talent-node.ts';
import {
  TALENT_NAMES,
  talentNodeId,
  TALENT_LEVELS,
  TALENT_ABILITY_ROWS,
  TALENT_ABILITIES_PER_COLUMN,
} from './talent-catalog.ts';

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
