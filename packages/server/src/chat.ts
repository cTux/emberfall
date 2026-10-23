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
  ].slice(-30);
}
