import type { BackpackItem, Player } from '@emberfall/common';
import {
  game,
  GEAR_DEFINITIONS,
  EQUIPMENT_SLOTS,
  canEquip,
  equippedItems,
  itemStatWeight,
  ItemStat,
} from '@emberfall/core';

/** Compare item contributions, including bonuses lost when replacing the equipped instance. */
export function itemComparison(
  item: BackpackItem,
  player: Pick<Player, 'classId' | 'equipment' | 'equipmentItems' | 'autoTarget'>,
) {
  const gear = GEAR_DEFINITIONS[item.itemId];
  if (!gear) return undefined;
  const slot = EQUIPMENT_SLOTS.find((slot) => canEquip(slot, gear, player.classId ?? 'warrior'));
  if (!slot) return undefined;
  const equippedId = equippedItems(player)[slot];
  const equipped = GEAR_DEFINITIONS[equippedId ?? ''];
  const instance = player.equipmentItems?.[slot];
  const previousBonuses = instance?.itemId === equippedId ? instance?.stats : undefined;
  const rows: { label: string; value: string; improved: boolean }[] = [];
  for (const [bonus, next, previous] of [
    [false, gear.stats, equipped?.stats ?? {}],
    [true, item.stats ?? {}, previousBonuses ?? {}],
  ] as const) {
    for (const stat of new Set([...Object.keys(next), ...Object.keys(previous)])) {
      if (
        !bonus &&
        (stat === 'attacksPerSecond' ||
          stat === (player.autoTarget === false ? 'range' : 'manualRange'))
      )
        continue;
      const delta = (next[stat] ?? 0) - (previous[stat] ?? 0);
      if (!delta) continue;
      const metadata = game.registries.stats.get(stat);
      const percentage = bonus
        ? ![ItemStat.Power, ItemStat.Armor, ItemStat.MaximumHealth].includes(
            stat as typeof ItemStat.Power,
          ) && !(itemStatWeight[stat as ItemStat] < 1)
        : metadata?.format === 'percent';
      const value = (delta * (!bonus && percentage ? 100 : 1)).toLocaleString('en', {
        maximumFractionDigits: 2,
      });
      rows.push({
        label: bonus
          ? stat === ItemStat.DotSpeed
            ? 'Bonus DOT Speed'
            : `Bonus ${stat.replace(/([A-Z])/g, ' $1').toLowerCase()}`
          : stat === 'manualRange'
            ? 'Range'
            : (metadata?.label ?? stat),
        value: `${delta > 0 ? '+' : ''}${value}${percentage ? '%' : ''}`,
        improved: delta > 0,
      });
    }
  }
  const nextRate = gear.stats.attacksPerSecond ?? 0;
  const previousRate = equipped?.stats.attacksPerSecond ?? 0;
  if (nextRate > 0 && previousRate > 0 && nextRate !== previousRate) {
    const delta = 1 / nextRate - 1 / previousRate;
    rows.push({
      label: 'Cooldown',
      value: `${delta > 0 ? '+' : ''}${delta.toLocaleString('en', { maximumFractionDigits: 2 })} sec`,
      improved: delta < 0,
    });
  }
  return { rows };
}
