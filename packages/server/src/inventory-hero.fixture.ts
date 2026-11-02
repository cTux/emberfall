import type { Player } from '@emberfall/core/contracts';
import { freshProgress } from './characters.ts';

export const hero = (): Player => {
  return {
    ...freshProgress('warrior'),
    classId: 'warrior',
    id: 'p',
    name: 'Hero',
    x: 2400,
    y: 1280,
    color: 0,
  };
};
