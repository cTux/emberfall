import type { ClassId } from '@emberfall/core/contracts';

export const STARTER_WEAPONS = {
  warrior: 'warrior-sword',
  ranger: 'ranger-bow',
  mage: 'mage-staff',
  druid: 'druid-staff',
} as const satisfies Record<ClassId, string>;
