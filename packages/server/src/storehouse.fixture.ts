import { type Player } from '@emberfall/common';

import { freshProgress } from './characters.ts';

export const item = (itemId = 'loot-helmet', quantity = 1) => ({
  id: crypto.randomUUID(),
  itemId,
  quantity,
});

export const hero = (): Player => ({
  ...freshProgress('warrior'),
  id: 'p',
  name: 'Hero',
  x: 0,
  y: 0,
  color: 0,
});
