import type { Enemy } from '@emberfall/common';

export const enemy = (id: number, x: number, y: number): Enemy => {
  return {
    id,
    x,
    y,
    hitpoints: 10,
    angle: 0,
  };
};
