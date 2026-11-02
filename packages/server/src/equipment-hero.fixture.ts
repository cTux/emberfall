import type { ClassId, Player } from '@emberfall/core/contracts';
import { freshProgress } from './characters.ts';

export const hero = (classId: ClassId = 'warrior'): Player => {
  return {
    ...freshProgress(classId),
    classId,
    id: 'p',
    name: 'Hero',
    x: 2400,
    y: 1280,
    color: 0,
  };
};
