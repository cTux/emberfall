import { ATTACK_DEFINITIONS } from "./abilities/attacks.ts";
import type { ClassId } from "../index.ts";

export const EQUIPMENT_SLOTS = [
  "weapon",
  "gloves",
  "helmet",
  "bodyArmor",
  "leggings",
  "boots",
  "amulet",
  "offHand",
  "ring",
] as const;
export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number];
export const SLOT_GEAR_TYPES = {
  weapon: ["sword", "bow", "fireStaff", "natureStaff"],
  gloves: ["gloves"],
  helmet: ["helmet"],
  bodyArmor: ["bodyArmor"],
  leggings: ["leggings"],
  boots: ["boots"],
  amulet: ["amulet"],
  offHand: ["shield", "quiver", "orb", "natureFocus"],
  ring: ["ring"],
} as const satisfies Record<EquipmentSlot, readonly string[]>;
export type GearType = (typeof SLOT_GEAR_TYPES)[EquipmentSlot][number];
export const CLASS_GEAR_TYPES = {
  warrior: ["sword", "shield"],
  ranger: ["bow", "quiver"],
  mage: ["fireStaff", "orb"],
  druid: ["natureStaff", "natureFocus"],
} as const satisfies Record<ClassId, readonly GearType[]>;
export type DamageType = "physical" | "fire" | "poison" | "nature";
export interface GearStats {
  power: number;
  attacksPerSecond: number;
  range: number;
  manualRange: number;
  criticalChance: number;
  criticalMultiplier: number;
  maxHitpoints: number;
  armor: number;
}
export interface GearDefinition {
  id: string;
  name: string;
  gearType: GearType;
  damageType?: DamageType;
  stats: Partial<GearStats>;
}

const BASE_CRITICAL_STATS = { criticalChance: 0.05, criticalMultiplier: 1.5 };
const BASE_ATTACK_SPEED = 1000 / ATTACK_DEFINITIONS.slash.intervalMs;
export const GEAR_DEFINITIONS: Record<string, GearDefinition> = {
  "warrior-sword": {
    id: "warrior-sword",
    name: "Warrior's sword",
    gearType: "sword",
    damageType: "physical",
    stats: {
      ...BASE_CRITICAL_STATS,
      power: 5,
      attacksPerSecond: BASE_ATTACK_SPEED,
      range: 88,
      manualRange: 88,
    },
  },
  "ranger-bow": {
    id: "ranger-bow",
    name: "Ranger's bow",
    gearType: "bow",
    damageType: "poison",
    stats: {
      ...BASE_CRITICAL_STATS,
      power: 5,
      attacksPerSecond: BASE_ATTACK_SPEED,
      range: 1000,
      manualRange: 1000,
    },
  },
  "mage-staff": {
    id: "mage-staff",
    name: "Mage's fire staff",
    gearType: "fireStaff",
    damageType: "fire",
    stats: {
      ...BASE_CRITICAL_STATS,
      power: 3,
      attacksPerSecond: BASE_ATTACK_SPEED,
      range: 250,
      manualRange: 1000,
    },
  },
  "druid-staff": {
    id: "druid-staff",
    name: "Druid's nature staff",
    gearType: "natureStaff",
    damageType: "nature",
    stats: {
      ...BASE_CRITICAL_STATS,
      power: 3,
      attacksPerSecond: BASE_ATTACK_SPEED,
      range: 250,
      manualRange: 1000,
    },
  },
};
export const STARTER_WEAPONS = {
  warrior: "warrior-sword",
  ranger: "ranger-bow",
  mage: "mage-staff",
  druid: "druid-staff",
} as const satisfies Record<ClassId, string>;
export type Equipment = Partial<Record<EquipmentSlot, string | null>>;
export const INNATE_STATS: GearStats = {
  power: 0,
  attacksPerSecond: 0,
  range: 0,
  manualRange: 0,
  criticalChance: 0,
  criticalMultiplier: 0,
  maxHitpoints: 100,
  armor: 0,
};
