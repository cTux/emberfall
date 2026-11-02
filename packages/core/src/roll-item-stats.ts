import { statValue } from './stat-value.ts';
import { Rarity, type ItemStat } from './enums/items.ts';
import { randomSource } from './random.ts';
import { itemTypeStats } from './configs/itemTypeStats.ts';
import { itemStatWeight } from './configs/itemStatWeight.ts';
import { rarityStatCount } from './configs/rarityStatCount.ts';

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
