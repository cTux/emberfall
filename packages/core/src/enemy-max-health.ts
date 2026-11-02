import type { Enemy } from '@emberfall/core/contracts';
import { Difficulty, EnemyKind, EnemyType } from '@emberfall/core/enums';
import { type createGame, game } from './game.ts';
import { enemyAttributes } from './utils/enemyAttributes.ts';

// Existing forty-pixel spatial bins cover neighboring crowd bodies without scanning every enemy.
// The 120-by-64 key grid preserves the established wrapping/hash behavior.

export function enemyMaxHealth(
  enemy: Pick<Enemy, 'kind' | 'archetype' | 'maxHitpoints'>,
  difficulty: Difficulty = Difficulty.Easy,
  context: ReturnType<typeof createGame> = game,
) {
  return (
    enemy.maxHitpoints ??
    enemyAttributes(
      enemy.archetype ?? EnemyKind.Skeleton,
      enemy.kind ?? EnemyType.Normal,
      difficulty,
      context,
    ).hitPoints
  );
}
