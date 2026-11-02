import { wrap } from './wrap.ts';

export const wrappedDelta = (a: number, b: number, size: number) => {
  return wrap(a - b + size / 2, size) - size / 2;
};
