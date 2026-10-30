import { ItemStat } from '../enums/items.ts';
import { legendaryItemStat } from './legendaryItemStat.ts';
export const itemStatWeight: Readonly<Record<ItemStat, number>> = Object.freeze(
  Object.fromEntries(
    Object.values(ItemStat).map((stat) => [
      stat,
      Object.values(legendaryItemStat).includes(stat) ? 0.2 : 1,
    ]),
  ) as Record<ItemStat, number>,
);
