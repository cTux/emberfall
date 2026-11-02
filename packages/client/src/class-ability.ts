import { game } from '@emberfall/core';

export const classAbility = Object.fromEntries(
  game.registries.classes.values().map((player) => {
    return [player.id, player.ailment];
  }),
);
