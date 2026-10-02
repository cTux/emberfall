import { randomUUID } from "node:crypto";
import { CHAT_LIMIT } from "@emberfall/common";
import type { ChatMessage, Player } from "@emberfall/common";

export function addChat(world: { chat?: ChatMessage[] }, text: string, player?: Player) {
  world.chat = [
    ...(world.chat ?? []),
    { id: randomUUID(), playerId: player?.id ?? "", name: player?.name ?? "System", text },
  ].slice(-CHAT_LIMIT);
}
