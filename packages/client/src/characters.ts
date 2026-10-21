import { game } from '@emberfall/core';
import { actorArt, artUrl } from './art';
import { CLASS_IDS } from '@emberfall/core';
import type { ClassId } from '@emberfall/common';
export const classSprite = (id: ClassId = 'warrior') =>
  artUrl(`${game.registries.classes.require(id).art}-portrait`);
export const characterImages = Object.fromEntries(
  CLASS_IDS.map((id) => {
    const image = actorArt(game.registries.classes.require(id).art);
    return [id, { walk: image, attack: image }];
  }),
) as Record<ClassId, { walk: HTMLImageElement; attack: HTMLImageElement }>;
