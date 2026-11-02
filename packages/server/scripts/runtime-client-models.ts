import type { Room } from '@colyseus/sdk';
import type { WorldState } from '@emberfall/core/contracts';
import type { SessionState } from '@emberfall/core/protocol';
export interface WorkloadPeer {
  room: Room<SessionState>;
  playerId: string;
  worldId: string;
  latest?: WorldState;
  receivedAt: number;
  states: number;
  saved: number;
  lastServerNow: number;
  lastAck: number;
  sent: Map<number, number>;
}
