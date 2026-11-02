import { LOOT_GEAR_TYPES } from './loot-gear-types.ts';

export const LOOT_ITEM_IDS = [
  ...LOOT_GEAR_TYPES.map((type) => {
    return `loot-${type}`;
  }),
  'warrior-sword',
  'ranger-bow',
  'mage-staff',
  'druid-staff',
];
