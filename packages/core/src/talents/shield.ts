import type { Player, SceneState } from '@emberfall/common';
import { state } from './state.ts';

export function shield(player: Player, scene: SceneState, amount: number, until: number) {
  const value = state(player, scene);
  value.barrier = Math.max(value.barrier, amount);
  value.barrierUntil = Math.max(value.barrierUntil, until);
}
