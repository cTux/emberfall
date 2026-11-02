import type { GearDefinition } from './gear-definition.ts';
import { LOOT_GEAR_TYPES } from './loot-gear-types.ts';
import { MILLISECONDS_PER_SECOND } from '@emberfall/common';
import { ATTACK_DEFINITIONS } from './abilities/attacks.ts';

// Existing starter balance gives every weapon a 5% critical chance and 1.5-times critical damage.
const BASE_CRITICAL_STATS = { criticalChance: 0.05, criticalMultiplier: 1.5 };

const BASE_ATTACK_SPEED = MILLISECONDS_PER_SECOND / ATTACK_DEFINITIONS.slash.intervalMs;

// These starter power/range values retain each class's existing attack balance; they are not measured optima.
export const GEAR_DEFINITIONS: Record<string, GearDefinition> = {
  'warrior-sword': {
    id: 'warrior-sword',
    name: "Warrior's sword",
    gearType: 'sword',
    damageType: 'physical',
    stats: {
      ...BASE_CRITICAL_STATS,
      power: 5,
      attacksPerSecond: BASE_ATTACK_SPEED,
      range: ATTACK_DEFINITIONS.slash.range,
      manualRange: ATTACK_DEFINITIONS.slash.range,
    },
  },
  'ranger-bow': {
    id: 'ranger-bow',
    name: "Ranger's bow",
    gearType: 'bow',
    damageType: 'poison',
    stats: {
      ...BASE_CRITICAL_STATS,
      power: 5,
      attacksPerSecond: BASE_ATTACK_SPEED,
      range: 1000,
      manualRange: 1000,
    },
  },
  'mage-staff': {
    id: 'mage-staff',
    name: "Mage's fire staff",
    gearType: 'fireStaff',
    damageType: 'fire',
    stats: {
      ...BASE_CRITICAL_STATS,
      power: 3,
      attacksPerSecond: BASE_ATTACK_SPEED,
      range: 250,
      manualRange: 1000,
    },
  },
  'druid-staff': {
    id: 'druid-staff',
    name: "Druid's nature staff",
    gearType: 'natureStaff',
    damageType: 'nature',
    stats: {
      ...BASE_CRITICAL_STATS,
      power: 3,
      attacksPerSecond: BASE_ATTACK_SPEED,
      range: 250,
      manualRange: 1000,
    },
  },
};

const LOOT_NAMES = [
  'Gloves',
  'Helmet',
  'Body armor',
  'Leggings',
  'Boots',
  'Amulet',
  'Ring',
  'Shield',
  'Quiver',
  'Mage orb',
  'Nature focus',
];

for (const [index, gearType] of LOOT_GEAR_TYPES.entries()) {
  const id = `loot-${gearType}`;
  GEAR_DEFINITIONS[id] = { id, name: LOOT_NAMES[index], gearType, stats: { armor: 1 }, price: 1 };
}
