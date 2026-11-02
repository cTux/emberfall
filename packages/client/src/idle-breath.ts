import { ANIMATION } from './animation-tuning.ts';

export const idleBreath = (now: number, row: number) => {
  return row === 0 ? 1 + Math.sin(now / ANIMATION.breathMs) * ANIMATION.breathScale : 1;
};
