import type { Player, WorldState } from '@emberfall/common';
import { wrappedDelta } from '@emberfall/common';
import { ARENA, FOREST, characterStats, inTrainingZone } from '@emberfall/core';
import { enemyHitbox } from '@emberfall/core/hitboxes';

export type CombatCursor = 'default' | 'disabled' | 'attack' | 'aim' | 'pressed';

/** Presentation only: hovering never selects a target or requests an action. */
export function combatCursor(
  world: WorldState | null,
  player: Player | undefined,
  pointer: { x: number; y: number } | undefined,
  held: boolean,
  blocked: boolean,
  autoTarget: boolean,
): CombatCursor {
  if (!world || !player || blocked || !pointer) {
    return 'default';
  }

  if (player.hitpoints <= 0) {
    return 'disabled';
  }

  const forest = player.scene === 'forest';
  const scene = forest ? world.scene : world.training;
  if (
    scene?.phase !== 'active' ||
    scene.pausedAt !== undefined ||
    (!forest && !inTrainingZone(player)) ||
    !characterStats(player).hasWeapon
  ) {
    return 'default';
  }

  if (held) {
    return 'pressed';
  }

  if (!autoTarget) {
    return 'aim';
  }

  const bounds = forest ? FOREST : ARENA;

  return scene.enemies.some((enemy) => {
    if (enemy.hitpoints <= 0) {
      return false;
    }

    const body = enemyHitbox(enemy);

    return (
      Math.hypot(
        wrappedDelta(pointer.x, body.x, bounds.width),
        wrappedDelta(pointer.y, body.y, bounds.height),
      ) <= body.radius
    );
  })
    ? 'attack'
    : 'default';
}
