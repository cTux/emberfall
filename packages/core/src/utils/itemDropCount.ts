import { randomSource } from '../random.ts';
import type { EnemyType } from '@emberfall/common/enums';
import { itemCountDropPercent } from '../configs/itemCountDropPercent.ts';
import { isMultiChanced } from './isMultiChanced.ts';

export function itemDropCount(type: EnemyType, random = randomSource.next) {
  const percent = itemCountDropPercent[type];

  return isMultiChanced(
    typeof percent === 'number'
      ? percent
      : percent.min + Math.floor(random() * (percent.max - percent.min + 1)),
    random,
  );
}
