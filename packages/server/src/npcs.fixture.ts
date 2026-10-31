import type { Player } from '@emberfall/common';

import { VillageLife, type NpcWorld } from './npcs.ts';
import type { NpcDialogue } from './npc-models.ts';

import { createPlayers } from './ecs/simulation.ts';

export const flush = () => {
  return new Promise<void>((resolve) => {
    return setImmediate(resolve);
  });
};

export const player = (id = 'p', x = 300, y = 250) => {
  return { id, name: id, x, y, hitpoints: 100 } as Player;
};

export function setup(
  dialogue: NpcDialogue = {
    generate: async () => {
      return { status: 'ok', text: 'Good morning!' };
    },
  },
) {
  const world: NpcWorld = { players: createPlayers() };
  world.players.set('p', player());
  const life = new VillageLife(world, dialogue, 0);

  return { world, life };
}
