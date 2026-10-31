import type {
  ClientMessage,
  ResourceState,
  VillageNpc,
  Merchant,
  ChatMessage,
  Player,
  SceneState,
  ServerMessage,
  WorldState,
} from '@emberfall/common';
import type { Peer } from '../network/peer.ts';

export type AccountIdentity = () => { characterId: string; nickname: string | null } | undefined;
export interface World {
  resources?: Record<string, ResourceState>;
  npcs?: VillageNpc[];
  merchant?: Merchant;
  chat?: ChatMessage[];
  id: string;
  name: string;
  hostId: string;
  salt: string;
  hash?: Buffer;
  players: Map<string, Player>;
  training?: SceneState;
}
export interface Session {
  chatAt?: number;
  id: string;
  worldId?: string;
  x: number;
  y: number;
  inputAt: number;
  epoch?: string;
  lastSeq: number;
  timed?: boolean;
  inputs: {
    seq: number;
    x: number;
    y: number;
    epoch?: string;
    durationMs?: number;
    elapsed?: number;
  }[];
  alive: boolean;
  busy: boolean;
  windowAt: number;
  messages: number;
  actions: number;
  actionAt: number;
  characterId?: string;
  reconnectUntil?: number;
  reconnectTimer?: ReturnType<typeof setTimeout>;
}

export type Sessions = Map<Peer, Session>;
export type Send = (peer: Peer, message: ServerMessage) => void;
export type Snapshot = (world: World, now?: number, viewer?: Player) => WorldState;
export type BroadcastState = (world: World, now: number) => void;

export type AdmissionMessage = Extract<ClientMessage, { type: 'join' | 'create' | 'resume' }>;
export interface CommandContext {
  session: Session;
  world?: World;
  now: number;
  reply: (message: ServerMessage) => void;
  error: (message: string) => void;
}
