import { game } from '@emberfall/core';

export const GEAR_LABELS = Object.fromEntries(
  game.registries.gearTypes.values().map((type) => {
    return [type.id, type.label];
  }),
);
