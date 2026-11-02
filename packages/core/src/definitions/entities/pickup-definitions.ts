import { game } from '../../game.ts';

export const PICKUP_DEFINITIONS = Object.freeze(
  Object.fromEntries(
    game.registries.pickups.values().map((entry) => {
      return [entry.id, entry.value];
    }),
  ),
) as unknown as typeof import('../../mods/base/entities/pickups.ts').PICKUP_DEFINITIONS;
