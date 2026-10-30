import type { Player } from './player.ts';
import type { SceneState } from './scene.ts';
import type { Merchant } from './inventory.ts';

export interface WorldSummary {
  id: string;
  name: string;
  locked: boolean;
  players: number;
  capacity: number;
}
export interface ResourceState {
  remaining: number;
  restoresAt: number;
}
export interface WorldState {
  partyRequests?: { fromId: string; expiresAt: number }[];
  resources?: Record<string, ResourceState>;
  npcs?: VillageNpc[];
  merchant?: Merchant;
  chat?: ChatMessage[];
  training?: SceneState;
  id: string;
  name: string;
  hostId: string;
  players: Player[];
  scene?: SceneState;
  serverNow?: number;
}
export interface ChatMessage {
  recipientIds?: string[];
  dimension?: string;
  npcId?: string;
  tone?: 'danger' | 'success';
  id: string;
  excludedPlayerId?: string;
  playerId: string;
  name: string;
  text: string;
}
export interface VillageNpc {
  id: string;
  name: string;
  buildingId: string;
  x: number;
  y: number;
  angle: number;
  moving: boolean;
  silenced: boolean;
  chat?: string;
  chatUntil?: number;
  workstationId?: string;
  workStartedAt?: number;
}
export type ServerMessage =
  | { type: 'pong'; id: number }
  | { type: 'worlds'; worlds: WorldSummary[] }
  | { type: 'joined'; playerId: string; world: WorldState; characterToken: string }
  | { type: 'saved'; savedAt: number }
  | { type: 'state'; world: WorldState }
  | { type: 'left' }
  | { type: 'error'; message: string };
