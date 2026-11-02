import {
  type ItemStat,
  Rarity,
  itemTypeStats,
  GEAR_DEFINITIONS,
  rarityStatCount,
  itemStatWeight,
  statValue,
} from '@emberfall/core';
import type { BackpackItem } from '@emberfall/core/contracts';

export function instance(
  itemId: string,
  stat: ItemStat,
  rarity: Rarity = Rarity.Legendary,
): BackpackItem {
  const stats: Record<string, number> = {};
  const pool = [stat, ...itemTypeStats[GEAR_DEFINITIONS[itemId].gearType]];

  for (const key of pool) {
    if (Object.keys(stats).length === rarityStatCount[rarity]) {
      break;
    }

    if (rarity !== Rarity.Legendary && itemStatWeight[key] < 1) {
      continue;
    }

    stats[key] = statValue(key, rarity);
  }

  return { id: crypto.randomUUID(), itemId, quantity: 1, rarity, stats };
}
