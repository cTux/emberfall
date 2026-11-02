import type { SceneState } from '@emberfall/core/contracts';
import { createTrainingScene } from '@emberfall/core';

export const arena = (training = true): SceneState => {
  return {
    ...createTrainingScene(0),
    id: 'arena',
    training,
    nextSpawn: 1e9,
    endsAt: 1e9,
    enemies: [],
  };
};
