import type { Conversation } from './npc-speech.ts';

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
