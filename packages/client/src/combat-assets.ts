import type { ClassId, DebuffKind } from "@emberfall/common";

export const weaponSrc = (id: ClassId) => `/assets/weapons/${id}.png`;
export const statusSrc = (kind: DebuffKind) => `/assets/status/${kind}.svg`;
export const classAbility = {
  warrior: "bleed",
  ranger: "poison",
  mage: "burn",
  druid: "roots",
} as const;
const load = (src: string) => {
  const image = new Image();
  image.src = src;
  return image;
};
export const weaponImages = {
  warrior: load(weaponSrc("warrior")),
  ranger: load(weaponSrc("ranger")),
  mage: load(weaponSrc("mage")),
  druid: load(weaponSrc("druid")),
};
export const statusImages = {
  bleed: load(statusSrc("bleed")),
  poison: load(statusSrc("poison")),
  burn: load(statusSrc("burn")),
  roots: load(statusSrc("roots")),
};
