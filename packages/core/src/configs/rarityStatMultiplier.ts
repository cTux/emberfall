import type { Rarity } from '../enums/items.ts';
// Existing rarity curve increases ordinary affix strength from common baseline to double at legendary.
// Intermediate 1.2/1.4/1.7 factors are retained balance choices, not a derived formula.
export const rarityStatMultiplier: Readonly<Record<Rarity, number>> = {
  common: 1,
  uncommon: 1.2,
  rare: 1.4,
  epic: 1.7,
  legendary: 2,
};
