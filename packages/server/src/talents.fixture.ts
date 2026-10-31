import type { Player, SceneState } from '@emberfall/common';
import { talentNodeId, learnTalent, equipTalent, castTalentAbility, game } from '@emberfall/core';

import { freshProgress } from './characters.ts';

export const hero = (classId = 'warrior'): Player => {
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
  };
};

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

export function ability(player: Player, column: number, row: number, rank = 1) {
  const id = talentNodeId(player.classId!, column, row);

  for (let i = 0; i < rank; i++) {
    learnTalent(player, id);
  }

  equipTalent(player, 0, id);

  return id;
}

export function cast(player: Player, scene: SceneState, now = 1000, players = [player]) {
  return castTalentAbility(
    scene,
    player,
    {
      slot: 0,
      classId: player.classId!,
      epoch: player.scene ? scene.id : 'lobby',
      aimX: 1050,
      aimY: 1000,
    },
    now,
    game,
    players,
  );
}
