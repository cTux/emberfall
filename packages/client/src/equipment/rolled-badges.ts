import type { BackpackItem } from '@emberfall/common';
import type { EquipmentBadgeView } from '@emberfall/ui';
import { itemStatMultiplier, ItemStat, itemStatWeight } from '@emberfall/core';
import { capitalize, number } from './metadata';

export function rolledBadges(item?: Pick<BackpackItem, 'stats' | 'stars'>): EquipmentBadgeView[] {
  return Object.entries(item?.stats ?? {}).map(([stat, original]) => {
    const value = original * itemStatMultiplier(item);
    const label =
      stat === ItemStat.DotSpeed
        ? 'DOT Speed'
        : capitalize(stat.replace(/([A-Z])/g, ' $1').toLowerCase());
    const flat =
      stat === ItemStat.Power ||
      stat === ItemStat.Armor ||
      stat === ItemStat.MaximumHealth ||
      itemStatWeight[stat as ItemStat] < 1;

    return {
      label,
      icon: 'magic',
      value: `+${number(value)}${flat ? '' : '%'}`,
      explanation:
        stat === ItemStat.DotSpeed
          ? 'Bleed, poison and burn tick faster: interval = base interval / (1 + DOT Speed / 100). Includes companion ailments; duration and damage per tick stay the same.'
          : stat === ItemStat.GoldIncrease || stat === ItemStat.ExpIncrease
            ? "Adds to the whole party's chance for additional drops. Each full 100% guarantees an extra copy."
            : `${label}: +${number(value)}${flat ? '' : '%'}. Equipped bonuses add together.`,
    };
  });
}
