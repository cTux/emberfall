import { game } from '../game.ts';

export const EQUIPMENT_SLOTS = Object.freeze(
  game.registries.slots.values().map((slot) => {
    return slot.id;
  }),
);
