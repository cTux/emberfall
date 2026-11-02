import type { Enemy } from '@emberfall/core/contracts';

export const enemy = (id: number, x: number, y: number): Enemy => {
  return {
    id,
    x,
    y,
    hitpoints: 10,
    angle: 0,
  };
};
