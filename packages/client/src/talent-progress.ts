import type { Player } from '@emberfall/common';

export type TalentProgress = Pick<Player, 'classId' | 'level' | 'talents'>;

export function sameTalentProgress(previous: TalentProgress, next: TalentProgress) {
  return (
    previous.classId === next.classId &&
    previous.level === next.level &&
    JSON.stringify(previous.talents) === JSON.stringify(next.talents)
  );
}
