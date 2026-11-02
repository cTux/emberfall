import { game } from '@emberfall/core';

export const SLOT_LABELS = Object.fromEntries(
  game.registries.slots.values().map((slot) => {
    return [slot.id, slot.label];
  }),
);
