import type { Player, EquipmentSlot } from '@emberfall/common';
import type { createEquipmentRules } from './equipment-rules.ts';
import type { createItemRules, BackpackItem } from './item-rules.ts';
import type { createStorageRules } from './storage-rules.ts';

export function createInventoryRules(
  equipment: ReturnType<typeof createEquipmentRules>,
  items: ReturnType<typeof createItemRules>,
  storage: ReturnType<typeof createStorageRules>,
) {
  const { GEAR_DEFINITIONS, EQUIPMENT_SLOTS, canEquip, equippedItems, syncEquipmentVitals } =
    equipment;
  const { itemDefinition, CONSUMABLES } = items;
  const { INVENTORY_SLOTS, STORAGE_SLOTS } = storage;

  function addItem(backpack: BackpackItem[], item: BackpackItem, capacity = INVENTORY_SLOTS) {
    const definition = itemDefinition(item.itemId);

    if (
      !Number.isSafeInteger(item.quantity) ||
      item.quantity <= 0 ||
      (definition.kind === 'gear' && item.quantity !== 1)
    ) {
      throw new Error('Invalid item quantity.');
    }

    if (definition.kind === 'consumable') {
      const stack = backpack.find((entry) => {
        return entry.itemId === item.itemId;
      });

      if (stack) {
        if (!Number.isSafeInteger(stack.quantity + item.quantity)) {
          throw new Error('Stack is too large.');
        }

        stack.quantity += item.quantity;

        return;
      }
    }

    const limit =
      definition.kind === 'resource'
        ? 200
        : definition.kind === 'consumable'
          ? Number.MAX_SAFE_INTEGER
          : 1;
    const stacks =
      definition.kind === 'gear'
        ? []
        : backpack.filter((entry) => {
            return entry.itemId === item.itemId && entry.quantity < limit;
          });
    let remaining = item.quantity;
    const planned = stacks.map((stack) => {
      const quantity = Math.min(remaining, limit - stack.quantity);
      remaining -= quantity;

      return { stack, quantity };
    });
    const slots = Math.ceil(remaining / limit);

    if (slots && backpack.length + slots > capacity) {
      throw new Error('The destination inventory is full.');
    }

    for (const { stack, quantity } of planned) {
      stack.quantity += quantity;
    }

    let first = true;
    while (remaining > 0) {
      const quantity = Math.min(remaining, limit);
      backpack.push({ ...item, id: first ? item.id : crypto.randomUUID(), quantity });
      first = false;
      remaining -= quantity;
    }
  }

  /** Move the whole entry only after the destination has accepted it. */
  function transferStoredItem(player: Player, tab: number, id: string, depositing: boolean) {
    const storage = player.storages?.[tab];

    if (!storage || !Number.isInteger(tab)) {
      throw new Error('Invalid storage tab.');
    }

    const backpack = (player.backpack ??= []);
    const source = depositing ? backpack : storage.items;
    const target = depositing ? storage.items : backpack;
    moveInventoryItem(source, target, id, depositing ? STORAGE_SLOTS : INVENTORY_SLOTS);
  }

  function moveStorageItem(player: Player, fromTab: number, toTab: number, id: string) {
    const source = player.storages?.[fromTab];
    const target = player.storages?.[toTab];

    if (
      !Number.isInteger(fromTab) ||
      !Number.isInteger(toTab) ||
      !source ||
      !target ||
      fromTab === toTab
    ) {
      throw new Error('Choose two different storage tabs.');
    }

    moveInventoryItem(source.items, target.items, id, STORAGE_SLOTS);
  }

  function moveInventoryItem(
    source: BackpackItem[],
    target: BackpackItem[],
    id: string,
    capacity: number,
  ) {
    const index = source.findIndex((item) => {
      return item.id === id;
    });

    if (index < 0) {
      throw new Error('Item is no longer available.');
    }

    addItem(target, source[index], capacity);
    source.splice(index, 1);
  }

  function useBackpackItem(player: Player, id: string) {
    const backpack = (player.backpack ??= []);
    const index = backpack.findIndex((item) => {
      return item.id === id;
    });

    if (index < 0) {
      throw new Error('Item is no longer in your backpack.');
    }

    const item = backpack[index];
    const consumable = CONSUMABLES[item.itemId as keyof typeof CONSUMABLES];

    if (consumable) {
      if (player.hitpoints <= 0 || player.hitpoints >= player.maxHitpoints) {
        throw new Error('You do not need healing.');
      }

      player.hitpoints = Math.min(player.maxHitpoints, player.hitpoints + consumable.healing);

      if (--item.quantity === 0) {
        backpack.splice(index, 1);
      }

      return;
    }

    const gear = GEAR_DEFINITIONS[item.itemId];
    const slot = EQUIPMENT_SLOTS.find((slot) => {
      return canEquip(slot, gear, player.classId ?? 'warrior');
    });

    if (!slot) {
      throw new Error('Your class cannot equip this item.');
    }

    player.equipment = { ...equippedItems(player) };
    const previous = player.equipment[slot];

    if (previous) {
      backpack[index] = player.equipmentItems?.[slot] ?? {
        id: crypto.randomUUID(),
        itemId: previous,
        quantity: 1,
      };
    } else {
      backpack.splice(index, 1);
    }

    player.equipment[slot] = item.itemId;
    player.equipmentItems = { ...player.equipmentItems, [slot]: item };
    syncEquipmentVitals(player);
  }

  function unequipItem(player: Player, slot: EquipmentSlot) {
    player.equipment = { ...equippedItems(player) };
    const itemId = player.equipment[slot];

    if (!itemId) {
      throw new Error('This equipment slot is empty.');
    }

    addItem(
      (player.backpack ??= []),
      player.equipmentItems?.[slot] ?? { id: crypto.randomUUID(), itemId, quantity: 1 },
    );
    player.equipment[slot] = null;

    if (player.equipmentItems) {
      delete player.equipmentItems[slot];
    }

    syncEquipmentVitals(player);
  }

  return { addItem, transferStoredItem, moveStorageItem, useBackpackItem, unequipItem };
}
