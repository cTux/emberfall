import { TALENT_VERSION } from './talent-version.ts';

export function talentNodeId(classId: string, column: number, row: number) {
  return `v${TALENT_VERSION}:${classId}:${column}:${row}`;
}
