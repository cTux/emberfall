import type { FighterState } from './fighter-state.ts';
import { fighters } from './fighters.ts';
import type { Player, SceneState } from '@emberfall/core/contracts';

export function state(player: Player, scene: SceneState): FighterState {
  let value = fighters.get(player);

  if (!value || value.scene !== scene || value.classId !== (player.classId ?? 'warrior')) {
    value = {
      scene,
      classId: player.classId ?? 'warrior',
      hits: 0,
      guardUntil: 0,
      guardReadyAt: 0,
      barrier: 0,
      barrierUntil: 0,
      wallUntil: 0,
      wallRank: 0,
      reprisalAt: 0,
      sequence: [],
      rhythmAt: 0,
    };
    fighters.set(player, value);
  }

  return value;
}
