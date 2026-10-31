import { isChanced } from './isChanced.ts';

export function isMultiChanced(percent: number, random = Math.random): number {
  if (percent <= 0 || Number.isNaN(percent)) return 0;
  return Math.floor(percent / 100) + (isChanced(percent % 100, random) ? 1 : 0);
}
