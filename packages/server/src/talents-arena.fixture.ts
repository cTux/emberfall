import type { SceneState } from '@emberfall/core/contracts';

export const arena = (): SceneState => {
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
    enemies: [{ id: 1, x: 1050, y: 1000, hitpoints: 1000, maxHitpoints: 1000, angle: 0 }],
    damage: [],
    portals: [],
  };
};
