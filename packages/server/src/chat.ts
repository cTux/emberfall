// Retain thirty messages for recent context while bounding world memory.
const CHAT_HISTORY_MESSAGES = 30;

import { randomUUID } from 'node:crypto';
import type { ChatMessage, Player } from '@emberfall/common';

export function addChat(
  world: { chat?: ChatMessage[] },
  text: string,
  player?: Player,
  excludedPlayerId?: string,
) {
  world.chat = [
    ...(world.chat ?? []),
    {
      id: randomUUID(),
      playerId: player?.id ?? '',
      name: player?.name ?? 'System',
      text,
      excludedPlayerId,
    },
  ].slice(-CHAT_HISTORY_MESSAGES);
}
