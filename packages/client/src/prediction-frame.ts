import type { Player, WorldState } from '@emberfall/common';

// Limit unconfirmed presentation to one second so a stalled connection cannot simulate indefinitely.

export const PREDICTION_LIMIT_MS = 1000;
export type ConfirmedFrame = Readonly<{
  world: WorldState;
  player: Player;
  receivedAt: number;
  epoch: string;
}>;
export type AttackState = { id?: number; at: number; casts: ReadonlyMap<number, number> };
