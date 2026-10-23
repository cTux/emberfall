import { game } from '@emberfall/core';
import type { ClassId, DebuffKind } from '@emberfall/common';
import { clientAsset } from './urls';

// URL helpers must not initialize the renderer's image atlases.
export const classSprite = (id: ClassId = 'warrior') =>
  clientAsset(`/assets/wardrobe-style/${game.registries.classes.require(id).art}-portrait.png`);
export const weaponSrc = (id: ClassId) =>
  clientAsset(`/assets/wardrobe-style/${game.registries.classes.require(id).art}-weapon.png`);
export const spellSrc = (id: ClassId) =>
  clientAsset(`/assets/wardrobe-style/${game.registries.classes.require(id).art}-spell.png`);
export const statusSrc = (kind: DebuffKind) => clientAsset(`/assets/wardrobe-style/${kind}.png`);
