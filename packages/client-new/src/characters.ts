import { PLAYER_DEFINITIONS } from "@emberfall/common-new/definitions/entities/players";
import { CLASS_IDS } from "@emberfall/common-new";
import type { ClassId } from "@emberfall/common-new";
export const classSprite = (id: ClassId = "warrior") => PLAYER_DEFINITIONS[id].sprite;
const load = (src: string) => {
  const image = new Image();
  image.src = src;
  return image;
};
export const characterImages = Object.fromEntries(
  CLASS_IDS.map((id) => [
    id,
    {
      walk: load(classSprite(id)),
      attack: load(`/assets/${id}-attack.png`),
    },
  ]),
) as Record<ClassId, { walk: HTMLImageElement; attack: HTMLImageElement }>;
