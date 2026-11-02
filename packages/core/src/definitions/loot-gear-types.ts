import { LOOT_ITEM_IDS } from './loot-item-ids.ts';
import { GEAR_DEFINITIONS } from './gear-definitions.ts';

export const LOOT_GEAR_TYPES = Object.freeze(
  LOOT_ITEM_IDS.map((id) => {
    return GEAR_DEFINITIONS[id].gearType;
  }),
);
