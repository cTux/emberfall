import type { Rarity } from '../enums/items.ts';
// Existing percentage weights favor common gear and progressively rarer higher qualities.
// Retain this balance curve until a deliberate loot-rate rebalance supplies new targets.
export const rarityDropChance: Readonly<Record<Rarity, number>> = {
  legendary: 0.01,
  epic: 0.1,
  rare: 1,
  uncommon: 10,
  common: 100,
};
