import { DEFAULT_TACTICS, type Player, type SceneState, type Enemy } from '@emberfall/common';

import { freshProgress } from './characters.ts';

export const tactics = () => {
  return structuredClone(DEFAULT_TACTICS);
};

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
