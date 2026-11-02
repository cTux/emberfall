import { type NpcWorld, villagePlayers } from './npc-world.ts';
import type { Conversation } from './npc-speech.ts';
import { forestDistance } from '@emberfall/core';
import { NPC_TIMING } from './npc-timing.ts';

export function conversationParticipants(world: NpcWorld, conversation: Conversation) {
  const npc = world.npcs?.find((n) => {
    return n.id === conversation.speaker;
  });
  const target = conversation.playerId
    ? world.players.get(conversation.playerId)
    : world.npcs?.find((n) => {
        return n.id === conversation.otherNpc;
      });

  if (
    !npc ||
    !target ||
    (conversation.playerId &&
      !villagePlayers(world).some((p) => {
        return p.id === conversation.playerId;
      })) ||
    forestDistance(npc, target) >
      (conversation.playerId ? NPC_TIMING.playerRange : NPC_TIMING.npcRange)
  ) {
    return undefined;
  }

  return { npc, target };
}
