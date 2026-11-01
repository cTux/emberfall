import { randomSource } from '../random.ts';
export type { CharacterStats, EquipmentOwner } from './equipment-rules.ts';
import type { Registries } from './contracts.ts';
import { createEquipmentRules } from './equipment-rules.ts';
import { createItemRules } from './item-rules.ts';
import { createStorageRules } from './storage-rules.ts';
import { createInventoryRules } from './inventory-rules.ts';
import { createMerchantRules } from './merchant-rules.ts';
import { createValidationRules } from './validation-rules.ts';

export function createRules(
  content: Registries,
  random = () => {
    return randomSource.next();
  },
) {
  const equipment = createEquipmentRules(content);
  const items = createItemRules(content, random);
  const storage = createStorageRules(items);
  const inventory = createInventoryRules(equipment, items, storage);
  const merchant = createMerchantRules(content, items, storage, inventory);
  const validation = createValidationRules(content, equipment, items, storage);
  const {
    canEquip,
    equipmentSchema,
    starterEquipment,
    validateClassEquipment,
    equippedItems,
    characterStats,
    syncEquipmentVitals,
    companionStats,
  } = equipment;
  const { itemDefinition, itemPrice, rollItem, CONSUMABLES, backpackSchema } = items;
  const {
    INVENTORY_SLOTS,
    STORAGE_SLOTS,
    storageNameSchema,
    storagesSchema,
    freshStorages,
    storehouseSchema,
  } = storage;
  const { addItem, transferStoredItem, moveStorageItem, useBackpackItem, unequipItem } = inventory;
  const { BUYBACK_SLOTS, merchantSchema, freshMerchant, tradeItem, sellAll } = merchant;
  const { classSchema, progressSchema, clientMessage } = validation;

  return Object.freeze({
    canEquip,
    equipmentSchema,
    starterEquipment,
    validateClassEquipment,
    equippedItems,
    characterStats,
    syncEquipmentVitals,
    companionStats,
    itemDefinition,
    itemPrice,
    rollItem,
    CONSUMABLES,
    backpackSchema,
    INVENTORY_SLOTS,
    STORAGE_SLOTS,
    storageNameSchema,
    storagesSchema,
    freshStorages,
    storehouseSchema,
    BUYBACK_SLOTS,
    merchantSchema,
    freshMerchant,
    addItem,
    transferStoredItem,
    moveStorageItem,
    useBackpackItem,
    unequipItem,
    tradeItem,
    sellAll,
    classSchema,
    progressSchema,
    clientMessage,
  });
}
