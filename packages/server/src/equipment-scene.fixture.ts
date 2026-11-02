import { target } from './target.fixture.ts';
import { createTrainingScene } from '@emberfall/core';

export const scene = (training = true) => {
  return {
    ...createTrainingScene(0),
    training,
    id: 's',
    enemies: [target()],
    nextSpawn: 1e9,
    endsAt: 1e9,
  };
};
