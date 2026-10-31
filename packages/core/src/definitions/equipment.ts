import { game } from '../game.ts';
export type {
  Equipment,
  EquipmentSlot,
  GearType,
  DamageType,
  GearStats,
  GearDefinition,
} from '@emberfall/common';
export const EQUIPMENT_SLOTS = Object.freeze(
  game.registries.slots.values().map((slot) => {
    return slot.id;
  }),
);
export const SLOT_GEAR_TYPES = Object.freeze(
  Object.fromEntries(
    game.registries.slots.values().map((slot) => {
      return [slot.id, slot.gearTypes];
    }),
  ),
);
export const CLASS_GEAR_TYPES = Object.freeze(
  Object.fromEntries(
    game.registries.classes.values().map((player) => {
      return [player.id, player.gearTypes];
    }),
  ),
);
export const GEAR_DEFINITIONS = Object.freeze(
  Object.fromEntries(
    game.registries.items
      .values()
      .filter((item) => {
        return item.kind === 'gear';
      })
      .map((item) => {
        return [item.id, item];
      }),
  ),
);
export const STARTER_WEAPONS = Object.freeze(
  Object.fromEntries(
    game.registries.classes.values().map((player) => {
      return [player.id, player.starterWeapon];
    }),
  ),
);
export const INNATE_STATS = Object.freeze(
  Object.fromEntries(
    game.registries.stats.values().map((stat) => {
      return [stat.id, stat.default];
    }),
  ),
);
export const LOOT_ITEM_IDS = Object.freeze(
  game.registries.items
    .values()
    .filter((item) => {
      return item.kind === 'gear' && item.loot;
    })
    .map((item) => {
      return item.id;
    }),
);
export const LOOT_GEAR_TYPES = Object.freeze(
  LOOT_ITEM_IDS.map((id) => {
    return GEAR_DEFINITIONS[id].gearType;
  }),
);
