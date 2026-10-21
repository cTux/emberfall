import { game } from '../../game.ts';
import { setting } from '../../content/views.ts';
export const PICKUP_DEFINITIONS = Object.freeze(
  Object.fromEntries(game.registries.pickups.values().map((entry) => [entry.id, entry.value])),
) as unknown as typeof import('../../mods/base/entities/pickups.ts').PICKUP_DEFINITIONS;
export const PICKUP_RULES =
  setting<typeof import('../../mods/base/entities/pickups.ts').PICKUP_RULES>('pickupRules');
