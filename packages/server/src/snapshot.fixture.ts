import { hero } from './snapshots-hero.fixture.ts';
import type { WorldState } from '@emberfall/common';

export const snapshot = (time: number, x: number): WorldState => {
  return {
    id: 'room',
    name: 'Room',
    hostId: 'p',
    serverNow: time,
    players: [{ ...hero, x, inputX: 1 }],
  };
};
