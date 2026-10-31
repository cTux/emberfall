import type { ChatMessage, Player, VillageNpc } from '@emberfall/common';

export interface NpcWorld {
  players: Map<string, Player>;
  npcs?: VillageNpc[];
  chat?: ChatMessage[];
}
export const villagePlayers = (world: NpcWorld) => {
  return [...world.players.values()].filter((p) => {
    return !p.scene && p.hitpoints > 0 && !p.reconnecting;
  });
};
