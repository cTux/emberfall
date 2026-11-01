import { ItemStat } from '../enums/items.ts';
import { legendaryItemStat } from './legendaryItemStat.ts';

// Existing legendary affix weight makes a mechanic affix one fifth as likely as a regular stat.
const LEGENDARY_STAT_WEIGHT = 0.2;
export const itemStatWeight: Readonly<Record<ItemStat, number>> = Object.freeze(
  Object.fromEntries(
    Object.values(ItemStat).map((stat) => {
      return [stat, Object.values(legendaryItemStat).includes(stat) ? LEGENDARY_STAT_WEIGHT : 1];
    }),
  ) as Record<ItemStat, number>,
);
