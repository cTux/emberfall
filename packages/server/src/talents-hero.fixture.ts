import type { Player } from '@emberfall/common';
import { freshProgress } from './characters.ts';

export const hero = (classId = 'warrior'): Player => {
  return {
    ...freshProgress(classId),
    id: 'hero',
    name: 'Hero',
    classId,
    level: 20,
    x: 1000,
    y: 1000,
    color: 0,
    scene: 'forest',
  };
};
