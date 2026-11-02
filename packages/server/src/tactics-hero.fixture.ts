import { tactics } from './default-tactics.fixture.ts';
import type { Player } from '@emberfall/core/contracts';
import { freshProgress } from './characters.ts';

export const hero = (classId = 'druid'): Player => {
  return {
    ...freshProgress(classId),
    id: 'hero',
    name: 'Hero',
    classId,
    level: 20,
    x: 1000,
    y: 1000,
    color: 0,
    scene: 'forest',
    tactics: tactics(),
  };
};
