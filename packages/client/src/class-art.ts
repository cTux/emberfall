import { game } from '@emberfall/core';
import type { ClassId, DebuffKind } from '@emberfall/common';
import { clientAsset } from './urls.ts';

// URL helpers must not initialize the renderer's image atlases.
export const classSprite = (id: ClassId = 'warrior') =>
  clientAsset(`/assets/wardrobe-style/${game.registries.classes.require(id).art}-portrait.png`);
export const weaponSrc = (id: ClassId) =>
  clientAsset(`/assets/wardrobe-style/${game.registries.classes.require(id).art}-weapon.png`);
export const spellSrc = (id: ClassId) =>
  clientAsset(`/assets/wardrobe-style/${game.registries.classes.require(id).art}-spell.png`);
export const statusSrc = (kind: DebuffKind) => clientAsset(`/assets/wardrobe-style/${kind}.png`);

const itemArt: Partial<Record<string, string>> = {
  ...Object.fromEntries(
    [
      'loot-gloves',
      'loot-helmet',
      'loot-bodyArmor',
      'loot-leggings',
      'loot-boots',
      'loot-amulet',
      'loot-ring',
      'loot-shield',
      'loot-quiver',
      'loot-orb',
      'loot-natureFocus',
      'log',
      'stick',
      'leaf',
      'rock',
      'stone',
    ].map((id) => [id, `item-${id}`]),
  ),
  ...Object.fromEntries(
    game.registries.classes
      .values()
      .map((definition) => [definition.starterWeapon, `${definition.art}-weapon`]),
  ),
  'health-potion': 'health-potion',
  'empty-bottle': 'empty-bottle',
};

export const itemArtName = (id: string) => itemArt[id];
