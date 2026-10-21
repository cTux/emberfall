import { game } from '../game.ts';
export type {
  Equipment,
  EquipmentSlot,
  GearType,
  DamageType,
  GearStats,
  GearDefinition,
} from '@emberfall/common';
export const EQUIPMENT_SLOTS = Object.freeze(game.registries.slots.values().map((slot) => slot.id));
export const SLOT_GEAR_TYPES = Object.freeze(
  Object.fromEntries(game.registries.slots.values().map((slot) => [slot.id, slot.gearTypes])),
);
export const CLASS_GEAR_TYPES = Object.freeze(
  Object.fromEntries(
    game.registries.classes.values().map((player) => [player.id, player.gearTypes]),
  ),
);
export const GEAR_DEFINITIONS = Object.freeze(
  Object.fromEntries(
    game.registries.items
      .values()
      .filter((item) => item.kind === 'gear')
      .map((item) => [item.id, item]),
  ),
);
export const STARTER_WEAPONS = Object.freeze(
  Object.fromEntries(
    game.registries.classes.values().map((player) => [player.id, player.starterWeapon]),
  ),
);
export const INNATE_STATS = Object.freeze(
  Object.fromEntries(game.registries.stats.values().map((stat) => [stat.id, stat.default])),
);
export const LOOT_ITEM_IDS = Object.freeze(
  game.registries.items
    .values()
    .filter((item) => item.kind === 'gear' && item.loot)
    .map((item) => item.id),
);
export const LOOT_GEAR_TYPES = Object.freeze(
  LOOT_ITEM_IDS.map((id) => GEAR_DEFINITIONS[id].gearType),
);
