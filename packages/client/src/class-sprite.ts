import type { ClassId } from '@emberfall/common';
import { clientAsset } from './urls.ts';

// URL helpers must not initialize the renderer's image atlases.
import { game } from '@emberfall/core';

// URL helpers must not initialize the renderer's image atlases.
export const classSprite = (id: ClassId = 'warrior') => {
  return clientAsset(
    `/assets/wardrobe-style/${game.registries.classes.require(id).art}-portrait.png`,
  );
};
