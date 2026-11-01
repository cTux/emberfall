import { randomSource } from '../random.ts';
import { PERCENT } from '@emberfall/common';
import { isChanced } from './isChanced.ts';

export function isMultiChanced(percent: number, random = randomSource.next): number {
  if (percent <= 0 || Number.isNaN(percent)) {
    return 0;
  }

  return Math.floor(percent / PERCENT) + (isChanced(percent % PERCENT, random) ? 1 : 0);
}
