import { Difficulty, EnemyType } from '@emberfall/common/enums';
import { game, type createGame } from '../game.ts';

export function enemyAttributes(
  kind: string,
  type: EnemyType = EnemyType.Normal,
  difficulty: Difficulty = Difficulty.Easy,
  context: ReturnType<typeof createGame> = game,
) {
  const base = context.registries.enemies.require(kind);
  const multiplier =
    context.registries.enemyTypes.require(type).multiplier *
    context.registries.difficulties.require(difficulty).multiplier;
  return { hitPoints: base.hitPoints * multiplier, damage: base.damage * multiplier };
}
