import { z } from 'zod';
import { inventoryItemSchema } from '@emberfall/common';
import {
  type ItemStat,
  Rarity,
  itemRarity,
  itemStatBaseValue,
  rarityStatMultiplier,
  itemTypeStats,
  itemStatWeight,
  rarityStatCount,
  statValue,
  rollRarity,
  rollItemStats,
} from '../item-stats.ts';
import type { Registries } from './contracts.ts';

export function createItemRules(content: Registries, roll = () => Math.random()) {
  const CONSUMABLES = Object.freeze(
    Object.fromEntries(
      content.items
        .values()
        .filter((item) => item.kind === 'consumable')
        .map((item) => [item.id, Object.freeze({ ...item, healing: item.healing })]),
    ),
  );
  function itemDefinition(id: string) {
    return content.items.require(id);
  }
  const itemSchema = inventoryItemSchema.refine((item) => {
    const definition = content.items.get(item.itemId);
    if (
      !definition ||
      (item.rarity !== undefined && !Object.values(Rarity).includes(item.rarity as Rarity))
    )
      return false;
    const rarity = itemRarity(item);
    const entries = Object.entries(item.stats ?? {});
    if (definition.kind !== 'gear')
      return (
        rarity === Rarity.Common &&
        entries.length === 0 &&
        (definition.kind === 'consumable' || item.quantity <= 200)
      );
    if (item.quantity !== 1) return false;
    if (item.stats === undefined) return rarity === Rarity.Common;
    return (
      entries.length === rarityStatCount[rarity] &&
      entries.every(
        ([stat, value]) =>
          itemTypeStats[definition.gearType]?.includes(stat as ItemStat) &&
          (rarity === Rarity.Legendary || itemStatWeight[stat as ItemStat] === 1) &&
          value === statValue(stat as ItemStat, rarity),
      )
    );
  }, 'Invalid item definition, rarity or rolled stats');
  const backpackSchema = z
    .array(itemSchema)
    .refine(
      (items) => new Set(items.map((item) => item.id)).size === items.length,
      'Duplicate item identity',
    );
  type BackpackItem = z.infer<typeof backpackSchema>[number];
  function rollItem(itemId: string, random = roll): BackpackItem {
    const definition = itemDefinition(itemId);
    if (definition.kind !== 'gear' || !itemTypeStats[definition.gearType])
      return { id: crypto.randomUUID(), itemId, quantity: 1 };
    const rarity = rollRarity(random);
    return {
      id: crypto.randomUUID(),
      itemId,
      quantity: 1,
      rarity,
      stats: rollItemStats(definition.gearType, rarity, random),
    };
  }
  function itemPrice(item: { itemId: string; rarity?: string; stats?: Record<string, number> }) {
    const definition = itemDefinition(item.itemId);
    const base = definition.price ?? 1;
    if (definition.kind !== 'gear') return base;
    const statPrice = Object.entries(item.stats ?? {}).reduce(
      (sum, [stat, value]) =>
        sum + value / itemStatBaseValue[stat as ItemStat] / itemStatWeight[stat as ItemStat],
      0,
    );
    return Math.ceil(base * rarityStatMultiplier[itemRarity(item)] + 5 * statPrice);
  }
  return { itemDefinition, itemPrice, rollItem, CONSUMABLES, backpackSchema, itemSchema };
}
export type BackpackItem = ReturnType<ReturnType<typeof createItemRules>['rollItem']>;
