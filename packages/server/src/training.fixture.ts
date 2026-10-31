import { TRAINING_ZONES } from '@emberfall/core';

import { freshProgress } from './characters.ts';
import type { Player } from '@emberfall/common';

export const hero = (): Player => ({
  ...freshProgress(),
  id: 'p',
  name: 'Hero',
  color: 0,
  x: TRAINING_ZONES[0].x - 15,
  y: 355,
});
