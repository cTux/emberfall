import type { EquipmentSlot } from './equipment-slot.ts';

export const SLOT_GEAR_TYPES = {
  weapon: ['sword', 'bow', 'fireStaff', 'natureStaff'],
  gloves: ['gloves'],
  helmet: ['helmet'],
  bodyArmor: ['bodyArmor'],
  leggings: ['leggings'],
  boots: ['boots'],
  amulet: ['amulet'],
  offHand: ['shield', 'quiver', 'orb', 'natureFocus'],
  ring: ['ring'],
} as const satisfies Record<EquipmentSlot, readonly string[]>;
