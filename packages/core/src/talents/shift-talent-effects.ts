import { scheduled } from './scheduled-definition.ts';
import { fighters } from './fighters.ts';
import type { SceneState, Player } from '@emberfall/core/contracts';

export function shiftTalentEffects(scene: SceneState, players: Player[], delay: number) {
  for (const entry of scheduled.get(scene) ?? []) {
    entry.at += delay;
    entry.until += delay;
  }

  for (const player of players) {
    const value = fighters.get(player);

    if (!value || value.scene !== scene) {
      continue;
    }

    for (const key of [
      'guardUntil',
      'guardReadyAt',
      'barrierUntil',
      'wallUntil',
      'reprisalAt',
      'rhythmAt',
    ] as const) {
      value[key] += delay;
    }

    if (value.fissure) {
      value.fissure.until += delay;
    }

    if (value.empoweredUntil) {
      value.empoweredUntil += delay;
    }

    for (const entry of value.sequence) {
      entry.at += delay;
    }
  }
}
