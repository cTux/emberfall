import type { ChatMessage, Player, VillageNpc } from '@emberfall/common';

export interface NpcWorld {
  players: Map<string, Player>;
  npcs?: VillageNpc[];
  chat?: ChatMessage[];
}
export const villagePlayers = (world: NpcWorld) =>
  [...world.players.values()].filter((p) => !p.scene && p.hitpoints > 0 && !p.reconnecting);
