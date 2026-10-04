import { actorArt, artUrl } from "./art";
import { CLASS_IDS } from "@emberfall/common-new";
import type { ClassId } from "@emberfall/common-new";
export const classSprite = (id: ClassId = "warrior") => artUrl(`${id}-portrait`);
export const characterImages = Object.fromEntries(
  CLASS_IDS.map((id) => {
    const image = actorArt(id);
    return [id, { walk: image, attack: image }];
  }),
) as Record<ClassId, { walk: HTMLImageElement; attack: HTMLImageElement }>;
