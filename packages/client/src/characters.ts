import { CLASS_IDS } from "@emberfall/common";
import type { ClassId } from "@emberfall/common";
export const classSprite = (id: ClassId = "warrior") =>
  `/assets/${id === "warrior" ? "knight" : id}.png`;
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
