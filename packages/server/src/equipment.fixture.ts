import { createTrainingScene } from '@emberfall/core';

import type { Player, ClassId, Enemy } from '@emberfall/common';
import { freshProgress } from './characters.ts';

export const hero = (classId: ClassId = 'warrior'): Player => ({
  ...freshProgress(classId),
  classId,
  id: 'p',
  name: 'Hero',
  x: 2400,
  y: 1280,
  color: 0,
});

export const target = (): Enemy => ({ id: 1, x: 2420, y: 1280, hitpoints: 100, angle: 0 });

export const scene = (training = true) => ({
  ...createTrainingScene(0),
  training,
  id: 's',
  enemies: [target()],
  nextSpawn: 1e9,
  endsAt: 1e9,
});
