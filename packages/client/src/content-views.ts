import { clientAsset } from './urls.ts';
import { game, type createGame } from '@emberfall/core';
import { PERCENT, type Player } from '@emberfall/common';

const builtinSlots = new Set([
  'weapon',
  'gloves',
  'helmet',
  'bodyArmor',
  'leggings',
  'boots',
  'amulet',
  'offHand',
  'ring',
]);
export const equipmentSlotArt = (id: string) => {
  return `slot-${builtinSlots.has(id) ? id : 'offHand'}`;
};

export function registeredSlotViews(context: ReturnType<typeof createGame> = game) {
  return context.registries.slots.values().map((slot) => {
    return {
      id: slot.id,
      label: slot.label,
      position: { column: slot.column, row: slot.row },
      icon: clientAsset(`/assets/wardrobe-style/${equipmentSlotArt(slot.id)}.png`),
    };
  });
}

export function additionalStatViews(player: Player, context: ReturnType<typeof createGame> = game) {
  const stats = context.rules.characterStats(player);

  return context.registries.stats
    .values()
    .filter((stat) => {
      return ![
        'power',
        'attacksPerSecond',
        'range',
        'manualRange',
        'criticalChance',
        'criticalMultiplier',
        'maxHitpoints',
        'armor',
      ].includes(stat.id);
    })
    .map((stat) => {
      return {
        label: stat.label,
        value: `${(stats.attributes[stat.id] * (stat.format === 'percent' ? PERCENT : 1)).toLocaleString('en', { maximumFractionDigits: 2 })}${stat.format === 'percent' ? '%' : ''}`,
      };
    });
}
