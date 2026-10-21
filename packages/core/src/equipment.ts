import { game } from './game.ts';
export * from './definitions/equipment.ts';
export type { CharacterStats, EquipmentOwner } from './content/rules.ts';
export const {
  canEquip,
  equipmentSchema,
  starterEquipment,
  validateClassEquipment,
  equippedItems,
  characterStats,
  syncEquipmentVitals,
  companionStats,
} = game.rules;
