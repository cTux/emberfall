import { game } from '@emberfall/core';

import { weaponSrc, statusSrc } from './class-art';
export { weaponSrc, spellSrc, statusSrc } from './class-art';
export const classAbility = Object.fromEntries(
  game.registries.classes.values().map((player) => [player.id, player.ailment]),
);
const load = (src: string) => {
  const image = new Image();
  image.src = src;

  return image;
};

export const weaponImages = Object.fromEntries(
  game.registries.classes.values().map((player) => [player.id, load(weaponSrc(player.id))]),
);
export const statusImages = {
  bleed: load(statusSrc('bleed')),
  poison: load(statusSrc('poison')),
  burn: load(statusSrc('burn')),
  roots: load(statusSrc('roots')),
  silence: load(statusSrc('silence')),
};
