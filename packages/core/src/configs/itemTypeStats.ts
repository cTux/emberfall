import { ItemStat } from '../enums/items.ts';
import { legendaryItemStat } from './legendaryItemStat.ts';
const offensive = [
  ItemStat.Power,
  ItemStat.AttackSpeed,
  ItemStat.DotSpeed,
  ItemStat.CriticalChance,
  ItemStat.CriticalDamage,
];
const reward = [ItemStat.GoldIncrease, ItemStat.ExpIncrease];
const regular: Record<string, ItemStat[]> = {
  sword: [...offensive, ItemStat.AreaOfEffect, ItemStat.Range],
  bow: [...offensive, ItemStat.Range],
  fireStaff: [...offensive, ItemStat.AreaOfEffect, ItemStat.Range],
  natureStaff: [...offensive, ItemStat.AreaOfEffect, ItemStat.Range],
  shield: [
    ItemStat.Armor,
    ItemStat.MaximumHealth,
    ItemStat.Power,
    ItemStat.AttackSpeed,
    ItemStat.DotSpeed,
    ItemStat.AreaOfEffect,
  ],
  quiver: [...offensive, ItemStat.Range],
  orb: [...offensive, ItemStat.AreaOfEffect, ItemStat.Range],
  natureFocus: [...offensive, ItemStat.AreaOfEffect, ItemStat.Range],
  gloves: [
    ItemStat.Armor,
    ItemStat.MaximumHealth,
    ItemStat.Power,
    ItemStat.AttackSpeed,
    ItemStat.DotSpeed,
    ItemStat.CriticalChance,
  ],
  helmet: [
    ItemStat.Armor,
    ItemStat.MaximumHealth,
    ItemStat.CriticalChance,
    ItemStat.CriticalDamage,
    ItemStat.Range,
  ],
  bodyArmor: [ItemStat.Armor, ItemStat.MaximumHealth],
  leggings: [ItemStat.Armor, ItemStat.MaximumHealth, ItemStat.MovementSpeed],
  boots: [ItemStat.Armor, ItemStat.MaximumHealth, ItemStat.MovementSpeed, ItemStat.Range],
  amulet: [ItemStat.Power, ItemStat.MaximumHealth, ItemStat.CriticalDamage, ItemStat.AreaOfEffect],
  ring: [...offensive, ItemStat.Armor],
};
export const itemTypeStats: Readonly<Record<string, readonly ItemStat[]>> = Object.freeze(
  Object.fromEntries(
    Object.entries(regular).map(([type, stats]) => [
      type,
      Object.freeze([
        ...stats,
        ...reward,
        ...(legendaryItemStat[type] ? [legendaryItemStat[type]] : []),
      ]),
    ]),
  ),
);
