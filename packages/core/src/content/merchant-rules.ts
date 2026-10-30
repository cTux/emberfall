import { z } from 'zod';
import type { Player } from '@emberfall/common';
import type { Registries } from './contracts.ts';
import type { createItemRules } from './item-rules.ts';
import type { createStorageRules } from './storage-rules.ts';
import type { createInventoryRules } from './inventory-rules.ts';

export function createMerchantRules(
  content: Registries,
  items: ReturnType<typeof createItemRules>,
  storage: ReturnType<typeof createStorageRules>,
  inventory: ReturnType<typeof createInventoryRules>,
) {
  const { backpackSchema, CONSUMABLES, itemDefinition, rollItem, itemPrice } = items;
  const { INVENTORY_SLOTS } = storage;
  const { addItem } = inventory;
  const BUYBACK_SLOTS = INVENTORY_SLOTS;
  const traderSchema = z
    .object({
      refreshAt: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
      coins: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
      backpack: backpackSchema,
      buyback: backpackSchema.refine((items) => items.length <= BUYBACK_SLOTS).optional(),
    })
    .transform((merchant) => ({
      ...merchant,
      backpack:
        merchant.buyback === undefined
          ? merchant.backpack.filter(
              (item) => !!CONSUMABLES[item.itemId as keyof typeof CONSUMABLES],
            )
          : merchant.backpack,
      buyback:
        merchant.buyback ??
        merchant.backpack
          .filter((item) => !CONSUMABLES[item.itemId as keyof typeof CONSUMABLES])
          .reverse()
          .slice(0, BUYBACK_SLOTS),
    }));
  const merchantSchema = traderSchema
    .and(z.object({ craftsman: traderSchema.optional() }))
    .transform(({ craftsman, ...merchant }) => ({
      ...merchant,
      backpack: merchant.backpack.filter((item) => itemDefinition(item.itemId).kind !== 'gear'),
      craftsman: craftsman ?? {
        coins: 5000,
        backpack: merchant.backpack.filter((item) => itemDefinition(item.itemId).kind === 'gear'),
        buyback: [],
      },
    }));
  type Trader = z.infer<typeof traderSchema>;
  type Merchant = z.infer<typeof merchantSchema>;
  function freshMerchant(now = Date.now()): Merchant {
    return {
      refreshAt: now + 30 * 60 * 1000,
      coins: 5000,
      backpack: [
        { id: crypto.randomUUID(), itemId: 'health-potion', quantity: 5 },
        { id: crypto.randomUUID(), itemId: 'empty-bottle', quantity: 200 },
      ],
      buyback: [],
      craftsman: {
        coins: 5000,
        backpack: content.items
          .values()
          .filter((item) => item.kind === 'gear' && item.loot)
          .map((item) => rollItem(item.id)),
        buyback: [],
      },
    };
  }
  /** Both owners commit together; older callers still transfer one item. */
  function tradeItem(
    player: Player,
    merchant: Trader,
    id: string,
    buying: boolean,
    amount: 1 | 10 | 'stack' = 1,
  ) {
    if (amount !== 1 && amount !== 10 && amount !== 'stack')
      throw new Error('Invalid trade quantity.');
    const source = buying ? merchant : player;
    const target = buying ? player : merchant;
    const backpack =
      buying && merchant.buyback.some((item) => item.id === id)
        ? merchant.buyback
        : (source.backpack ?? []);
    const index = backpack.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Item is no longer available.');
    const item = backpack[index];
    const quantity = amount === 'stack' ? item.quantity : Math.min(amount, item.quantity);
    const price = itemPrice(item) * quantity;
    if (!Number.isSafeInteger(price)) throw new Error('Trade price is too large.');
    if ((target.coins ?? 0) < price) throw new Error('Not enough gold.');
    if (!Number.isSafeInteger((source.coins ?? 0) + price))
      throw new Error('Gold balance is too large.');
    const transferred = { ...item, id: crypto.randomUUID(), quantity };
    if (buying) addItem((player.backpack ??= []), transferred);
    else {
      merchant.buyback.unshift(transferred);
      merchant.buyback.length = Math.min(merchant.buyback.length, BUYBACK_SLOTS);
    }
    item.quantity -= quantity;
    if (item.quantity === 0) backpack.splice(index, 1);
    target.coins = (target.coins ?? 0) - price;
    source.coins = (source.coins ?? 0) + price;
  }

  /** The server commits the detached player and merchant together, as for one-item trades. */
  function sellAll(player: Player, merchant: Trader) {
    const items = player.backpack ?? [];
    const total = items.reduce((sum, item) => sum + itemPrice(item) * item.quantity, 0);
    if (!Number.isSafeInteger(total) || !Number.isSafeInteger((player.coins ?? 0) + total))
      throw new Error('Gold balance is too large.');
    if (merchant.coins < total) throw new Error('Not enough gold.');
    merchant.buyback = [
      ...[...items]
        .reverse()
        .slice(0, BUYBACK_SLOTS)
        .map((item) => ({ ...item, id: crypto.randomUUID() })),
      ...merchant.buyback,
    ].slice(0, BUYBACK_SLOTS);
    merchant.coins -= total;
    player.coins = (player.coins ?? 0) + total;
    player.backpack = [];
  }

  return { BUYBACK_SLOTS, merchantSchema, freshMerchant, tradeItem, sellAll };
}
