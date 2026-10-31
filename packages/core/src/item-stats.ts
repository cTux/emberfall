export { ItemStat, Rarity } from './enums/items.ts';
import { type ItemStat, Rarity } from './enums/items.ts';
export { rarityDropChance } from './configs/rarityDropChance.ts';
import { rarityDropChance } from './configs/rarityDropChance.ts';
export { rarityStatCount } from './configs/rarityStatCount.ts';
import { rarityStatCount } from './configs/rarityStatCount.ts';
export { rarityStatMultiplier } from './configs/rarityStatMultiplier.ts';
import { rarityStatMultiplier } from './configs/rarityStatMultiplier.ts';
export { rarityColor } from './configs/rarityColor.ts';
export { itemStatBaseValue } from './configs/itemStatBaseValue.ts';
import { itemStatBaseValue } from './configs/itemStatBaseValue.ts';
export { legendaryItemStat } from './configs/legendaryItemStat.ts';
export { itemStatWeight } from './configs/itemStatWeight.ts';
import { itemStatWeight } from './configs/itemStatWeight.ts';
export { itemTypeStats } from './configs/itemTypeStats.ts';
import { itemTypeStats } from './configs/itemTypeStats.ts';
export function itemRarity(item?: { rarity?: string }): Rarity {
  return Object.values(Rarity).find((rarity) => rarity === item?.rarity) ?? Rarity.Common;
}
export function statValue(stat: ItemStat, rarity: Rarity) {
  return itemStatBaseValue[stat] * (itemStatWeight[stat] < 1 ? 1 : rarityStatMultiplier[rarity]);
}
export function rollRarity(random = Math.random): Rarity {
  let roll = random() * 100;
  for (const [rarity, chance] of Object.entries(rarityDropChance)) {
    if (roll < chance) return rarity as Rarity;
    roll -= chance;
  }
  return Rarity.Common;
}
export function rollItemStats(gearType: string, rarity: Rarity, random = Math.random) {
  const pool = (itemTypeStats[gearType] ?? []).filter(
    (stat) => rarity === Rarity.Legendary || itemStatWeight[stat] === 1,
  );
  const stats: Partial<Record<ItemStat, number>> = {};
  for (let i = 0; i < rarityStatCount[rarity] && pool.length; i++) {
    let roll = random() * pool.reduce((sum, stat) => sum + itemStatWeight[stat], 0);
    const index = pool.findIndex((stat) => (roll -= itemStatWeight[stat]) < 0);
    const [stat] = pool.splice(index < 0 ? pool.length - 1 : index, 1);
    stats[stat] = statValue(stat, rarity);
  }
  return stats;
}
