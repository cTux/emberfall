import type { Rarity } from '../enums/items.ts';
export const rarityDropChance: Readonly<Record<Rarity, number>> = {
  legendary: 0.01,
  epic: 0.1,
  rare: 1,
  uncommon: 10,
  common: 100,
};
