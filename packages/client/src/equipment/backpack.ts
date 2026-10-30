import {
  itemDefinition,
  GEAR_DEFINITIONS,
  CONSUMABLES,
  EQUIPMENT_SLOTS,
  canEquip,
  itemRarity,
  rarityColor,
  itemPrice,
} from '@emberfall/core';
import type { BackpackItem, Player } from '@emberfall/common';
import { itemComparison } from '../item-comparison';
import { number, capitalize, GEAR_LABELS, ITEM_CLASSES } from './metadata';
import { weaponBadges, rolledBadges } from './badges';
import { itemIcon } from './item-icon';

export function backpackViews(
  items: BackpackItem[],
  player: Pick<Player, 'autoTarget' | 'classId' | 'equipment' | 'equipmentItems'>,
) {
  return items.map((item) => {
    const definition = itemDefinition(item.itemId);
    const gear = GEAR_DEFINITIONS[item.itemId];
    const potion = CONSUMABLES[item.itemId as keyof typeof CONSUMABLES];
    const equipRestriction =
      gear && !EQUIPMENT_SLOTS.some((slot) => canEquip(slot, gear, player.classId ?? 'warrior'))
        ? 'Your class cannot equip this item.'
        : undefined;
    return {
      ...item,
      stackable: definition.kind !== 'gear',
      name: definition.name,
      rarity: capitalize(itemRarity(item)),
      rarityColor: rarityColor[itemRarity(item)],
      icon: itemIcon(item.itemId),
      price: itemPrice(item),
      subtitle: gear ? GEAR_LABELS[gear.gearType] : capitalize(definition.kind),
      comparison: itemComparison(item, player),
      primary: gear?.stats.armor ? { label: 'Armor', value: number(gear.stats.armor) } : undefined,
      stats: [
        ...(gear && ITEM_CLASSES[item.itemId]
          ? weaponBadges(player, ITEM_CLASSES[item.itemId], gear.id)
          : []),
        ...rolledBadges(item),
      ],
      equipRestriction,
      useAction: gear ? (equipRestriction ? undefined : 'Equip') : potion ? 'Use' : undefined,
      details: potion ? `Restores ${potion.healing} health` : '',
    };
  });
}
