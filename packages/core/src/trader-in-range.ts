import { forestDistance } from './forest-distance.ts';
import { COLLISION } from './definitions/collision.ts';
import { INTERACTION_RADIUS } from './definitions/worlds/forest.ts';

export function traderInRange(
  player: { x: number; y: number; scene?: string; hitpoints: number },
  npcId: string,
  npcs: readonly { id: string; x: number; y: number }[] | undefined,
) {
  return (
    !player.scene &&
    player.hitpoints > 0 &&
    (npcId === 'innkeeper' || npcId === 'craftsman') &&
    !!npcs?.some((npc) => {
      return (
        npc.id === npcId &&
        forestDistance({ x: player.x, y: player.y + COLLISION.feetOffset }, npc) <
          INTERACTION_RADIUS
      );
    })
  );
}
