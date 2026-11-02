import type { Player } from '@emberfall/common';
import { freshProgress } from './characters.ts';

export const hero = (): Player => {
  return {
    ...freshProgress('warrior'),
    id: 'p',
    name: 'Hero',
    x: 0,
    y: 0,
    color: 0,
  };
};
