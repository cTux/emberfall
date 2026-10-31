import type { EnemyType } from '@emberfall/common/enums';
import { enemyTypeAttributesMultiplier } from '../configs/enemyTypeAttributesMultiplier.ts';

export const enemyTypeMultiplier = (type: EnemyType) => {
  return enemyTypeAttributesMultiplier[type];
};
