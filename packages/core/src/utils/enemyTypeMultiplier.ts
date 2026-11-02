import type { EnemyType } from '@emberfall/core/enums';
import { enemyTypeAttributesMultiplier } from '../configs/enemyTypeAttributesMultiplier.ts';

export const enemyTypeMultiplier = (type: EnemyType) => {
  return enemyTypeAttributesMultiplier[type];
};
