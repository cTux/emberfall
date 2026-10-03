import { randomUUID } from "node:crypto";
import { CHAT_LIMIT } from "@emberfall/common-new";
import type { ChatMessage, Player } from "@emberfall/common-new";

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
      playerId: player?.id ?? "",
      name: player?.name ?? "System",
      text,
      excludedPlayerId,
    },
  ].slice(-CHAT_LIMIT);
}
