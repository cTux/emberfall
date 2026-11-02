import type { SceneState, Player } from '@emberfall/common';
import { characterStats } from './equipment.ts';
import { PERCENT } from '@emberfall/common';
import { forestDistance } from './scene.ts';

export function talentArea(
  scene: SceneState,
  point: { x: number; y: number },
  radius: number,
  player?: Player,
) {
  radius *= 1 + (player ? characterStats(player).bonuses.areaOfEffect / PERCENT : 0);

  return scene.enemies.filter((enemy) => {
    return enemy.hitpoints > 0 && forestDistance(point, enemy) <= radius;
  });
}
