import { VILLAGE_DEFINITION } from '@emberfall/core/definitions/worlds/village';
import { forestDistance, wrappedDelta } from '@emberfall/core';
import { villagePlayers, type NpcWorld } from './npc-world.ts';
import type { Conversation } from './npc-speech.ts';
const PLAYER_RANGE = 120;
const NPC_RANGE = 160;
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
    forestDistance(npc, target) > (conversation.playerId ? PLAYER_RANGE : NPC_RANGE)
  ) {
    return undefined;
  }

  return { npc, target };
}

export function faceConversation(
  world: NpcWorld,
  conversation: Conversation,
  actors: NonNullable<ReturnType<typeof conversationParticipants>>,
) {
  actors.npc.moving = false;
  actors.npc.workstationId = actors.npc.workStartedAt = undefined;
  actors.npc.angle = Math.atan2(
    wrappedDelta(actors.target.y, actors.npc.y, VILLAGE_DEFINITION.geometry.height),
    wrappedDelta(actors.target.x, actors.npc.x, VILLAGE_DEFINITION.geometry.width),
  );
  if (conversation.otherNpc) {
    const other = world.npcs!.find((n) => {
      return n.id === conversation.otherNpc;
    })!;
    other.moving = false;
    other.workstationId = other.workStartedAt = undefined;
    other.angle = actors.npc.angle + Math.PI;
  }
}

export function conversationBlocks(conversations: (Conversation | undefined)[]) {
  const blocked = new Set<string>();
  for (const conversation of conversations) {
    if (!conversation) {
      continue;
    }

    blocked.add(conversation.speaker);
    if (conversation.otherNpc) {
      blocked.add(conversation.otherNpc);
    }
  }

  return blocked;
}
