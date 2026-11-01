import type { BackpackItem, Player, EquipmentSlot } from '@emberfall/common';
import { ITEM_IMPROVEMENT_PRICES } from '../item-improvement.ts';
import type { createEquipmentRules } from './equipment-rules.ts';

export function createImprovementRules(equipment: ReturnType<typeof createEquipmentRules>) {
  const { equippedItems, GEAR_DEFINITIONS, syncEquipmentVitals } = equipment;

  function improvableItems(player: Player) {
    const entries: { item: BackpackItem; slot?: EquipmentSlot }[] = [];

    for (const [slot, itemId] of Object.entries(equippedItems(player))) {
      if (itemId && GEAR_DEFINITIONS[itemId]) {
        entries.push({
          slot,
          item: player.equipmentItems?.[slot] ?? { id: itemId, itemId, quantity: 1 },
        });
      }
    }

    for (const item of player.backpack ?? []) {
      if (GEAR_DEFINITIONS[item.itemId]) {
        entries.push({ item });
      }
    }

    return entries;
  }

  function improveItem(player: Player, id: string, stars: number, slot?: EquipmentSlot) {
    const entry = improvableItems(player).find((entry) => {
      return entry.item.id === id && entry.slot === slot;
    });

    if (!entry || !Number.isInteger(stars) || (entry.item.stars ?? 0) !== stars) {
      throw new Error('Item changed. Choose it again.');
    }

    const price = ITEM_IMPROVEMENT_PRICES[stars];

    if (price === undefined) {
      throw new Error('This item already has five stars.');
    }

    if ((player.coins ?? 0) < price) {
      throw new Error('Not enough gold.');
    }

    if (slot !== undefined) {
      player.equipment = { ...equippedItems(player) };
      player.equipmentItems = {
        ...player.equipmentItems,
        [slot]: {
          ...entry.item,
          id: player.equipmentItems?.[slot]?.id ?? crypto.randomUUID(),
          stars: stars + 1,
        },
      };
    } else {
      entry.item.stars = stars + 1;
    }

    player.coins = (player.coins ?? 0) - price;
    syncEquipmentVitals(player);
  }

  return { improvableItems, improveItem };
}
