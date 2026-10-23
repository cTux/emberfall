import { clientAsset } from './urls.ts';
import { game } from '@emberfall/core';
import type { ClassId, DebuffKind } from '@emberfall/common';

export const weaponSrc = (id: ClassId) =>
  clientAsset(`/assets/wardrobe-style/${game.registries.classes.require(id).art}-weapon.png`);
export const spellSrc = (id: ClassId) =>
  clientAsset(`/assets/wardrobe-style/${game.registries.classes.require(id).art}-spell.png`);
export const statusSrc = (kind: DebuffKind) => clientAsset(`/assets/wardrobe-style/${kind}.png`);
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
