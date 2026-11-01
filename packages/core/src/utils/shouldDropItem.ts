import { randomSource } from '../random.ts';
import type { EnemyType } from '@emberfall/common/enums';
import { itemDropChance } from '../configs/itemDropChance.ts';
import { isChanced } from './isChanced.ts';

export const shouldDropItem = (type: EnemyType, random = randomSource.next) => {
  return isChanced(itemDropChance[type], random);
};
