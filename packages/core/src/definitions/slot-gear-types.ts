import { game } from '../game.ts';

export const SLOT_GEAR_TYPES = Object.freeze(
  Object.fromEntries(
    game.registries.slots.values().map((slot) => {
      return [slot.id, slot.gearTypes];
    }),
  ),
);
