import { z } from "zod";
import { BEAR_DEFINITION } from "./definitions/entities/companions.ts";
import {
  EQUIPMENT_SLOTS,
  SLOT_GEAR_TYPES,
  CLASS_GEAR_TYPES,
  GEAR_DEFINITIONS,
  STARTER_WEAPONS,
  INNATE_STATS,
} from "./definitions/equipment.ts";
import type {
  Equipment,
  EquipmentSlot,
  GearDefinition,
  GearStats,
  DamageType,
} from "./definitions/equipment.ts";
import type { ClassId, Player } from "./index.ts";
export * from "./definitions/equipment.ts";

export function canEquip(slot: EquipmentSlot, item: GearDefinition, classId: ClassId) {
  return (
    (SLOT_GEAR_TYPES[slot] as readonly string[]).includes(item.gearType) &&
    ((slot !== "weapon" && slot !== "offHand") ||
      (CLASS_GEAR_TYPES[classId] as readonly string[]).includes(item.gearType))
  );
}
export const equipmentSchema = z
  .partialRecord(z.enum(EQUIPMENT_SLOTS), z.string().nullable())
  .refine(
    (equipment) =>
      Object.entries(equipment).every(
        ([slot, id]) =>
          id === null ||
          (!!GEAR_DEFINITIONS[id] &&
            (SLOT_GEAR_TYPES[slot as EquipmentSlot] as readonly string[]).includes(
              GEAR_DEFINITIONS[id].gearType,
            )),
      ),
    "Unknown or incompatible equipment",
  );
export function starterEquipment(classId: ClassId): Equipment {
  return { weapon: STARTER_WEAPONS[classId] };
}
export function validateClassEquipment(equipment: Equipment, classId: ClassId) {
  const parsed = equipmentSchema.parse(equipment);
  if (
    !Object.entries(parsed).every(
      ([slot, id]) => id === null || canEquip(slot as EquipmentSlot, GEAR_DEFINITIONS[id], classId),
    )
  )
    throw new Error("Equipment is incompatible with this class");
  return parsed;
}
export type EquipmentOwner = Pick<Player, "classId" | "equipment">;
export interface CharacterStats extends GearStats {
  damageType: DamageType;
  hasWeapon: boolean;
  attackIntervalMs: number;
  damageReduction: number;
}
export function equippedItems(player: EquipmentOwner) {
  return player.equipment ?? starterEquipment(player.classId ?? "warrior");
}
/** Definitions are immutable content; only equipped IDs belong to character saves. */
export function characterStats(player: EquipmentOwner): CharacterStats {
  const stats = { ...INNATE_STATS };
  const equipment = equippedItems(player);
  const classId = player.classId ?? "warrior";
  let weapon: GearDefinition | undefined;
  for (const slot of EQUIPMENT_SLOTS) {
    const id = equipment[slot];
    const gear = id ? GEAR_DEFINITIONS[id] : undefined;
    if (!gear || !canEquip(slot, gear, classId)) continue;
    if (slot === "weapon") weapon = gear;
    for (const key of Object.keys(gear.stats) as (keyof GearStats)[])
      stats[key] += gear.stats[key] ?? 0;
  }
  stats.criticalChance = Math.max(0, Math.min(1, stats.criticalChance));
  stats.criticalMultiplier = Math.max(1, stats.criticalMultiplier);
  stats.armor = Math.max(0, stats.armor);
  return {
    ...stats,
    damageType: weapon?.damageType ?? "physical",
    hasWeapon: !!weapon,
    attackIntervalMs:
      weapon && stats.attacksPerSecond > 0 ? 1000 / stats.attacksPerSecond : Infinity,
    damageReduction: stats.armor / (100 + stats.armor),
  };
}
export function syncEquipmentVitals(player: Player) {
  const stats = characterStats(player);
  player.maxHitpoints = stats.maxHitpoints;
  player.hitpoints = Math.min(player.hitpoints, player.maxHitpoints);
}
export function companionStats(player: Player): CharacterStats {
  return {
    ...characterStats(player),
    damageType: BEAR_DEFINITION.damageType,
    range: BEAR_DEFINITION.range,
    manualRange: BEAR_DEFINITION.range,
    maxHitpoints: player.maxHitpoints * BEAR_DEFINITION.healthMultiplier,
  };
}
