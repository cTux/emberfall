import { game, CLASS_IDS } from '@emberfall/core';
import { actorArt } from './art';
import type { ClassId } from '@emberfall/common';
export { classSprite } from './class-art';
export const characterImages = Object.fromEntries(
  CLASS_IDS.map((id) => {
    const image = actorArt(game.registries.classes.require(id).art);
    return [id, { walk: image, attack: image }];
  }),
) as Record<ClassId, { walk: HTMLImageElement; attack: HTMLImageElement }>;
