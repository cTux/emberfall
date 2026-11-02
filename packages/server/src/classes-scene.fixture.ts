import type { SceneState } from '@emberfall/core/contracts';

export const scene = (): SceneState => {
  return {
    id: 's',
    type: 'Forest',
    difficulty: 'Easy',
    phase: 'active',
    ready: [],
    countdownAt: null,
    endsAt: 1e9,
    nextSpawn: 1e9,
    sequence: 100,
    enemies: [],
    damage: [],
    portals: [],
  };
};
