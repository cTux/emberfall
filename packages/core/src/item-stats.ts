import { randomSource } from './random.ts';
import { PERCENT } from '@emberfall/common';
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
  return (
    Object.values(Rarity).find((rarity) => {
      return rarity === item?.rarity;
    }) ?? Rarity.Common
  );
}

export function statValue(stat: ItemStat, rarity: Rarity) {
  return itemStatBaseValue[stat] * (itemStatWeight[stat] < 1 ? 1 : rarityStatMultiplier[rarity]);
}

export function rollRarity(random = randomSource.next, multiplier = 1): Rarity {
  let roll = random() * PERCENT;

  for (const [rarity, chance] of Object.entries(rarityDropChance)) {
    const adjustedChance = rarity === Rarity.Common ? chance : chance * multiplier;

    if (roll < adjustedChance) {
      return rarity as Rarity;
    }

    roll -= adjustedChance;
  }

  return Rarity.Common;
}

export function rollItemStats(gearType: string, rarity: Rarity, random = randomSource.next) {
  const pool = (itemTypeStats[gearType] ?? []).filter((stat) => {
    return rarity === Rarity.Legendary || itemStatWeight[stat] === 1;
  });
  const stats: Partial<Record<ItemStat, number>> = {};

  for (let i = 0; i < rarityStatCount[rarity] && pool.length; i++) {
    let roll =
      random() *
      pool.reduce((sum, stat) => {
        return sum + itemStatWeight[stat];
      }, 0);
    const index = pool.findIndex((stat) => {
      return (roll -= itemStatWeight[stat]) < 0;
    });
    const [stat] = pool.splice(index < 0 ? pool.length - 1 : index, 1);
    stats[stat] = statValue(stat, rarity);
  }

  return stats;
}
