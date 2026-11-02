import type { ClassId } from '@emberfall/core/contracts';
import { clientAsset } from './urls.ts';

// URL helpers must not initialize the renderer's image atlases.
import { game } from '@emberfall/core';

export const weaponSrc = (id: ClassId) => {
  return clientAsset(
    `/assets/wardrobe-style/${game.registries.classes.require(id).art}-weapon.png`,
  );
};
