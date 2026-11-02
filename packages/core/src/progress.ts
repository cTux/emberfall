import type { CharacterProgress } from '@emberfall/core/contracts';

export type Progress = Pick<CharacterProgress, 'level' | 'talents'> & { classId?: string };
