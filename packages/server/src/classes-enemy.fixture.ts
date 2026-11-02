import type { Enemy } from '@emberfall/common';

export const enemy = (id: number, x = 2480, hp = 100): Enemy => {
  return {
    id,
    x,
    y: 1280,
    hitpoints: hp,
    angle: 0,
  };
};
