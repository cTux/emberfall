import type { Player } from '@emberfall/common';

export const player = (id = 'p', x = 300, y = 250) => {
  return { id, name: id, x, y, hitpoints: 100 } as Player;
};
