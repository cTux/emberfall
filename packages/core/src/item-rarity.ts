import { Rarity } from './enums/items.ts';

export function itemRarity(item?: { rarity?: string }): Rarity {
  return (
    Object.values(Rarity).find((rarity) => {
      return rarity === item?.rarity;
    }) ?? Rarity.Common
  );
}
