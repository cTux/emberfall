import { player } from './npcs-player.fixture.ts';
import type { NpcDialogue } from './npc-models.ts';
import { type NpcWorld, VillageLife } from './npcs.ts';
import { createPlayers } from './ecs/simulation.ts';

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
