import type { Player } from '@emberfall/common';
import { freshProgress } from './characters.ts';

export const hero = (classId = 'warrior', id = 'hero'): Player => {
  return {
    ...freshProgress(classId),
    classId,
    id,
    name: id,
    x: 2400,
    y: 1280,
    color: 0,
    level: 20,
    scene: 'forest',
    autoTarget: false,
    aimX: 3000,
    aimY: 1280,
  };
};
