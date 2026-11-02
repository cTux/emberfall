import type { EquipmentSlot } from './equipment-slot.ts';

export type Equipment = Partial<Record<EquipmentSlot, string | null>>;
