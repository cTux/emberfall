import type { EnemyType } from '@emberfall/common/enums';
import { itemDropChance } from '../configs/itemDropChance.ts';
import { isChanced } from './isChanced.ts';

export const shouldDropItem = (type: EnemyType, random = Math.random) =>
  isChanced(itemDropChance[type], random);
