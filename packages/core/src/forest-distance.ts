import { wrappedDelta } from '@emberfall/common';
import { FOREST } from './definitions/worlds/forest.ts';

export const forestDistance = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  return Math.hypot(wrappedDelta(a.x, b.x, FOREST.width), wrappedDelta(a.y, b.y, FOREST.height));
};
