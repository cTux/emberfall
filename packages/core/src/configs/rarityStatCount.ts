import type { Rarity } from '../enums/items.ts';
// Existing rarity progression grants one, two or three affixes without changing saved gear rolls.
export const rarityStatCount: Readonly<Record<Rarity, number>> = {
  common: 1,
  uncommon: 1,
  rare: 2,
  epic: 2,
  legendary: 3,
};
