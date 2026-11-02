import { modelHitbox } from './model-hitbox.ts';
import type { Enemy } from '@emberfall/core/contracts';

// Existing fallback matches the forty-eight-pixel actor art when a caller omits its size.
import { type createGame, game } from './game.ts';

export function enemyHitbox(enemy: Enemy, context: ReturnType<typeof createGame> = game) {
  return modelHitbox(enemy, context.registries.enemies.require(enemy.archetype ?? 'skeleton').size);
}
