import type { Player } from '@emberfall/common';
import { freshProgress } from './characters.ts';

export const hero = (): Player => ({
  ...freshProgress('warrior'),
  classId: 'warrior',
  id: 'p',
  name: 'Hero',
  x: 2400,
  y: 1280,
  color: 0,
});

export const item = (itemId: string, quantity = 1) => ({
  id: crypto.randomUUID(),
  itemId,
  quantity,
});
