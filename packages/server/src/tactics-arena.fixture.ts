import type { Enemy, SceneState } from '@emberfall/common';

export const arena = (enemies: Enemy[] = []): SceneState => {
  return {
    id: 'test',
    type: 'Forest',
    difficulty: 'Easy',
    phase: 'active',
    ready: [],
    countdownAt: null,
    endsAt: null,
    nextSpawn: 1e9,
    sequence: 0,
    enemies,
    damage: [],
    portals: [],
  };
};
