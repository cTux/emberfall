import { LOBBY_PORTAL } from '@emberfall/core';
import type { Player } from '@emberfall/common';

export const hero = (id: string): Player => {
  return {
    id,
    name: id,
    x: LOBBY_PORTAL.x,
    y: LOBBY_PORTAL.y - 15,
    color: 0,
    level: 1,
    experience: 0,
    hitpoints: 100,
    maxHitpoints: 100,
    playtimeSeconds: 0,
  };
};
