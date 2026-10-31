import type { WorldState, Player } from '@emberfall/common';

export const hero: Player = {
  id: 'p',
  name: 'P',
  x: 420,
  y: 340,
  color: 0,
  hitpoints: 100,
  maxHitpoints: 100,
  level: 1,
  experience: 0,
  playtimeSeconds: 0,
};

export const snapshot = (time: number, x: number): WorldState => ({
  id: 'room',
  name: 'Room',
  hostId: 'p',
  serverNow: time,
  players: [{ ...hero, x, inputX: 1 }],
});
