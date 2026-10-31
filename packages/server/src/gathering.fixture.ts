import type { Player } from '@emberfall/common';

import { VILLAGE_RESOURCES } from '@emberfall/core';
import { freshProgress } from './characters.ts';

export const hero = (node = VILLAGE_RESOURCES[0]): Player => {
  return {
    ...freshProgress('warrior'),
    id: crypto.randomUUID(),
    name: 'Gatherer',
    classId: 'warrior',
    x: node.x,
    y: node.y - 15,
    color: 0,
    backpack: [],
  };
};

export const item = (itemId: string, quantity = 1) => {
  return {
    id: crypto.randomUUID(),
    itemId,
    quantity,
  };
};
