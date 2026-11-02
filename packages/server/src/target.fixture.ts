import type { Enemy } from '@emberfall/common';

export const target = (): Enemy => {
  return { id: 1, x: 2420, y: 1280, hitpoints: 100, angle: 0 };
};
