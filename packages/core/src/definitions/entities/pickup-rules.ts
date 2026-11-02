import { setting } from '../../content/views.ts';

export const PICKUP_RULES =
  setting<typeof import('../../mods/base/entities/pickups.ts').PICKUP_RULES>('pickupRules');
