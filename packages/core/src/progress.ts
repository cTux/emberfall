import type { CharacterProgress } from '@emberfall/common';

export type Progress = Pick<CharacterProgress, 'level' | 'talents'> & { classId?: string };
