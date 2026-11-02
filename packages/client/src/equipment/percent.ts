import { number } from './number.ts';
import { PERCENT } from '@emberfall/core/contracts';

export const percent = (value: number) => {
  return `${number(value * PERCENT)}%`;
};
