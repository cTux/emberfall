import { itemStatMultiplier } from './item-stat-multiplier.ts';
import type { BackpackItem } from '@emberfall/core/contracts';

// Anvil balance: each tier adds ten percent of the original stats, up to +50%.

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
