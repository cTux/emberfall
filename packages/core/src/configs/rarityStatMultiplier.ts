import type { Rarity } from '../enums/items.ts';
export const rarityStatMultiplier: Readonly<Record<Rarity, number>> = {
  common: 1,
  uncommon: 1.2,
  rare: 1.4,
  epic: 1.7,
  legendary: 2,
};
