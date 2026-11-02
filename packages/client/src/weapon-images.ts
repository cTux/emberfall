import { load } from './load.ts';
import { game } from '@emberfall/core';
import { weaponSrc } from './class-art';

export const weaponImages = Object.fromEntries(
  game.registries.classes.values().map((player) => {
    return [player.id, load(weaponSrc(player.id))];
  }),
);
