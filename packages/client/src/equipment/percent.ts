import { number } from './number.ts';
import { PERCENT } from '@emberfall/common';

export const percent = (value: number) => {
  return `${number(value * PERCENT)}%`;
};
