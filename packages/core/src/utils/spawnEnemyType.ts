import { EnemyType } from '@emberfall/common/enums';
import { enemyTypeSpawnChance } from '../configs/enemyTypeSpawnChance.ts';
import { isChanced } from './isChanced.ts';

export function spawnEnemyType(): EnemyType {
  for (const type of Object.keys(enemyTypeSpawnChance) as (keyof typeof enemyTypeSpawnChance)[]) {
    if (isChanced(enemyTypeSpawnChance[type])) return type;
  }
  return EnemyType.Normal;
}
