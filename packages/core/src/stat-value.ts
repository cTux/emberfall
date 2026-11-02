import type { ItemStat, Rarity } from './enums/items.ts';
import { itemStatBaseValue } from './configs/itemStatBaseValue.ts';
import { itemStatWeight } from './configs/itemStatWeight.ts';
import { rarityStatMultiplier } from './configs/rarityStatMultiplier.ts';

export function statValue(stat: ItemStat, rarity: Rarity) {
  return itemStatBaseValue[stat] * (itemStatWeight[stat] < 1 ? 1 : rarityStatMultiplier[rarity]);
}
