import { ITEM_STAR_BONUS } from './item-star-bonus.ts';
import type { BackpackItem } from '@emberfall/common';

// Anvil balance: each tier adds ten percent of the original stats, up to +50%.

export function itemStatMultiplier(item?: Pick<BackpackItem, 'stars'>) {
  return 1 + (item?.stars ?? 0) * ITEM_STAR_BONUS;
}
