import { freshProgress } from './characters.ts';

import type { Player, SceneState, Enemy } from '@emberfall/common';

export const hero = (): Player => {
  return {
    ...freshProgress(),
    id: 'p',
    name: 'Hero',
    x: 2400,
    y: 1280,
    color: 0,
    scene: 'forest',
  };
};

export const enemy = (id: number, x = 2480, hp = 100): Enemy => {
  return {
    id,
    x,
    y: 1280,
    hitpoints: hp,
    angle: 0,
  };
};

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
