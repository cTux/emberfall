import type { GearType } from './gear-type.ts';
import type { ClassId } from '@emberfall/core/contracts';

export const CLASS_GEAR_TYPES = {
  warrior: ['sword', 'shield'],
  ranger: ['bow', 'quiver'],
  mage: ['fireStaff', 'orb'],
  druid: ['natureStaff', 'natureFocus'],
} as const satisfies Record<ClassId, readonly GearType[]>;
