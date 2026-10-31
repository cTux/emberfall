import type { Player, ChatMessage } from '@emberfall/common';
export interface Party {
  id: string;
  members: string[];
}
export interface PartyRequest {
  fromId: string;
  toId: string;
  partyId?: string;
  fromPartyId?: string;
  toPartyId?: string;
  expiresAt: number;
}
export interface PartyWorld {
  players: Map<string, Player>;
  chat?: ChatMessage[];
}
