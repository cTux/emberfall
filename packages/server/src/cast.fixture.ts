import type { Player, SceneState } from '@emberfall/core/contracts';
import { castTalentAbility, game } from '@emberfall/core';

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
