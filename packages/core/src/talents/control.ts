import type { Enemy } from '@emberfall/core/contracts';

export function control(enemy: Enemy, now: number, duration: number) {
  if (enemy.kind === 'boss') {
    return;
  }

  enemy.controlledUntil = Math.max(enemy.controlledUntil ?? 0, now + duration);
  enemy.attack = undefined;
}
