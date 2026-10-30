import { ItemStat } from '../enums/items.ts';
export const legendaryItemStat: Readonly<Record<string, ItemStat>> = {
  sword: ItemStat.AdditionalAttack,
  shield: ItemStat.AdditionalAttack,
  bow: ItemStat.ProjectilePierce,
  quiver: ItemStat.ProjectilePierce,
  fireStaff: ItemStat.MoreProjectiles,
  orb: ItemStat.MoreProjectiles,
  natureStaff: ItemStat.ProjectilesBounce,
  natureFocus: ItemStat.ProjectilesBounce,
};
