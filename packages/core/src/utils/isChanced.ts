import { randomSource } from '../random.ts';
import { PERCENT } from '@emberfall/common';

export function isChanced(percent: number, random = randomSource.next): boolean {
  if (percent <= 0) {
    return false;
  }

  if (percent >= PERCENT) {
    return true;
  }

  return random() * PERCENT < percent;
}
