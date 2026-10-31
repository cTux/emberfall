import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  freshMerchant,
  tradeItem,
  itemPrice,
  merchantSchema,
  Rarity,
  ItemStat,
  rollItemStats,
  sellAll,
} from '@emberfall/core';
import type { Player, ServerMessage } from '@emberfall/common';
import { freshProgress } from './characters.ts';

import { createRuntime } from './runtime.ts';
import { Peer } from './network/peer.ts';

test('gear stock migrates to Bram once, preserving rolls, balances and both buybacks', () => {
  const fresh = freshMerchant();
  const gear = fresh.craftsman.backpack;
  const old = {
    coins: 712,
    refreshAt: 1234,
    backpack: [...fresh.backpack, ...gear],
    buyback: [gear[0]],
  };
  const migrated = merchantSchema.parse(old);
  assert.deepEqual(migrated.backpack, fresh.backpack);
  assert.deepEqual(migrated.craftsman.backpack, gear);
  assert.deepEqual(migrated.buyback, old.buyback);
  assert.equal(migrated.coins, 712);
  assert.equal(migrated.refreshAt, 1234);
  assert.equal(migrated.craftsman.coins, 5000);
  assert.deepEqual(merchantSchema.parse(migrated), migrated);
  assert.equal(
    merchantSchema.safeParse({ ...migrated, craftsman: { ...migrated.craftsman, coins: -1 } })
      .success,
    false,
  );
});

test('gear prices rise with rarity and stat value, normalize stat units and price scarce affixes higher', () => {
  const prices = Object.values(Rarity).map((rarity) => {
    return itemPrice({
      itemId: 'loot-helmet',
      rarity,
      stats: rollItemStats('helmet', rarity, () => {
        return 0.5;
      }),
    });
  });
  assert(
    prices.every((price, i) => {
      return Number.isSafeInteger(price) && price > (prices[i - 1] ?? 1);
    }),
  );
  assert.equal(itemPrice({ itemId: 'empty-bottle' }), 1);
  assert.equal(itemPrice({ itemId: 'health-potion' }), 1);
  assert.equal(itemPrice({ itemId: 'loot-helmet' }), 1);
  const priced = (stats: Record<string, number>) => {
    return itemPrice({ itemId: 'warrior-sword', rarity: Rarity.Legendary, stats });
  };

  assert.equal(priced({ [ItemStat.Power]: 2 }), priced({ [ItemStat.MaximumHealth]: 10 }));
  assert(priced({ [ItemStat.Power]: 2 }) > priced({ [ItemStat.Power]: 1 }));
  assert(priced({ [ItemStat.AdditionalAttack]: 1 }) > priced({ [ItemStat.Power]: 2 }));
});

test('Bram uses authoritative prices, rejects another shop IDs and failed saves, and persists buyback', async (t) => {
  const runtime = await createRuntime();
  const messages: ServerMessage[] = [];
  const peer = new Peer(
    (message) => {
      return messages.push(message);
    },
    () => {},
  );
  try {
    runtime.connect(peer);
    const world = [...runtime.worlds.values()][0];
    peer.receive({ type: 'join', worldId: world.id, playerName: 'Gear buyer', password: '' });
    const player = [...world.players.values()][0];
    const bram = world.npcs!.find((npc) => {
      return npc.id === 'craftsman';
    })!;
    Object.assign(bram, { x: 1000, y: 1000 });
    Object.assign(
      world.npcs!.find((npc) => {
        return npc.id === 'innkeeper';
      })!,
      { x: 1020, y: 1000 },
    );
    Object.assign(player, { x: 1000, y: 985, coins: 1000 });
    const merchant = world.merchant!;
    const gear = merchant.craftsman!.backpack[0];
    const price = itemPrice(gear);
    peer.receive({ type: 'trade', npcId: 'craftsman', id: merchant.backpack[0].id, buying: true });
    assert.match((messages.at(-1) as { message: string }).message, /available/);
    const before = structuredClone({ player, merchant });
    const failure = t.mock.method(runtime.characters, 'save', () => {
      throw new Error('disk full');
    });
    peer.receive({ type: 'trade', npcId: 'craftsman', id: gear.id, buying: true });
    assert.match((messages.at(-1) as { message: string }).message, /Unable to save/);
    assert.deepEqual({ player, merchant: world.merchant }, before);
    failure.mock.restore();
    peer.receive({ type: 'trade', npcId: 'craftsman', id: gear.id, buying: true, price: 0 });
    assert.equal(player.coins, 1000 - price);
    assert.equal(world.merchant!.craftsman!.coins, 5000 + price);
    const bought = player.backpack![0];
    peer.receive({ type: 'sellAll', npcId: 'craftsman' });
    assert.equal(player.coins, 1000);
    assert.equal(world.merchant!.craftsman!.buyback[0].itemId, gear.itemId);
    assert.equal(world.merchant!.buyback.length, 0);
    const sold = world.merchant!.craftsman!.buyback[0];
    assert.deepEqual(sold.stats, bought.stats);
    assert.deepEqual(runtime.characters.merchant(world.id), world.merchant);
    peer.receive({ type: 'trade', npcId: 'craftsman', id: sold.id, buying: true });
    assert.equal(player.coins, 1000 - price);
    assert.deepEqual(player.backpack![0].stats, bought.stats);
    Object.assign(player, { x: 2000, y: 2000 });
    peer.receive({ type: 'sellAll', npcId: 'craftsman' });
    assert.match((messages.at(-1) as { message: string }).message, /Trade near/);
    assert.equal(player.backpack!.length, 1);
  } finally {
    t.mock.restoreAll();
    await runtime.close();
  }
});

test('Sell all and buyback use the same rolled price without rounding drift', () => {
  const merchant = freshMerchant().craftsman;
  const player = { ...freshProgress(), id: 'p', name: 'Seller', x: 0, y: 0, color: 0 } as Player;
  player.backpack = merchant.backpack.slice(0, 3);
  const total = player.backpack.reduce((sum, item) => {
    return sum + itemPrice(item);
  }, 0);
  sellAll(player, merchant);
  assert.equal(player.coins, total);
  assert.equal(merchant.coins, 5000 - total);
  // Snapshot the queue because each purchase removes its entry.
  // oxlint-disable-next-line unicorn/no-useless-spread
  for (const entry of [...merchant.buyback]) {
    tradeItem(player, merchant, entry.id, true);
  }

  assert.equal(player.coins, 0);
  assert.equal(merchant.coins, 5000);
});
