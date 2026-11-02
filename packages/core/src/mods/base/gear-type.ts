import type { SLOT_GEAR_TYPES } from './slot-gear-types.ts';
import type { EquipmentSlot } from './equipment-slot.ts';

export type GearType = (typeof SLOT_GEAR_TYPES)[EquipmentSlot][number];
