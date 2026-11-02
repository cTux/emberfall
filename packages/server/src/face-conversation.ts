import type { conversationParticipants } from './conversation-participants.ts';
import type { NpcWorld } from './npc-world.ts';
import type { Conversation } from './npc-speech.ts';
import { wrappedDelta } from '@emberfall/core';
import { VILLAGE_DEFINITION } from '@emberfall/core/definitions/worlds/village';

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
