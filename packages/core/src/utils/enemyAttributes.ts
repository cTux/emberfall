import { Difficulty, EnemyType, type EnemyKind } from '@emberfall/common/enums';
import { enemyKindAttribute } from '../configs/enemyKindAttribute.ts';
import { difficultyMultiplier } from './difficultyMultiplier.ts';
import { enemyTypeMultiplier } from './enemyTypeMultiplier.ts';

export function enemyAttributes(
  kind: EnemyKind,
  type: EnemyType = EnemyType.Normal,
  difficulty: Difficulty = Difficulty.Easy,
) {
  const base = enemyKindAttribute[kind];
  const multiplier = enemyTypeMultiplier(type) * difficultyMultiplier(difficulty);
  return { hitPoints: base.hitPoints * multiplier, damage: base.damage * multiplier };
}
