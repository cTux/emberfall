import { VILLAGE_RESOURCES } from '@emberfall/core';
import type { Player } from '@emberfall/common';
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
