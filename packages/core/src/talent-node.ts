import type { TalentKind } from './talent-kind.ts';

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
