import type { BackpackItem } from '@emberfall/common';

// Anvil balance: each tier adds ten percent of the original stats, up to +50%.
export const ITEM_STAR_BONUS = 0.1;
// Gold costs for the first through fifth star, as specified for the anvil.
export const ITEM_IMPROVEMENT_PRICES: readonly number[] = [10, 20, 30, 50, 100];

export function itemStatMultiplier(item?: Pick<BackpackItem, 'stars'>) {
  return 1 + (item?.stars ?? 0) * ITEM_STAR_BONUS;
}

export function improvedItemStats(
  stats: Record<string, number>,
  item?: Pick<BackpackItem, 'stars'>,
) {
  return Object.fromEntries(
    Object.entries(stats).map(([stat, value]) => {
      return [stat, value * itemStatMultiplier(item)];
    }),
  );
}
