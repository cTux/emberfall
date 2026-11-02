import type { Player } from '@emberfall/core/contracts';

export const player = (x: number, y: number): Player => {
  return {
    id: 'p',
    name: 'p',
    x,
    y,
    scene: 'forest',
    hitpoints: 100,
    maxHitpoints: 100,
    level: 1,
    experience: 0,
    playtimeSeconds: 0,
    color: 0,
    attackAt: 1e9,
  };
};
