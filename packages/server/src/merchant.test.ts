import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  freshMerchant,
  tradeItem,
  backpackSchema,
  itemDefinition,
  itemPrice,
  merchantSchema,
  Rarity,
  ItemStat,
  rollItemStats,
  sellAll,
  LOOT_ITEM_IDS,
} from '@emberfall/core';
import type { ChatMessage, Merchant, Player, ServerMessage } from '@emberfall/common';
import { CharacterStore, freshProgress } from './characters.ts';
import { refreshMerchant } from './merchant.ts';
import { RUNTIME } from '@emberfall/core/definitions/runtime';
import { createRuntime } from './runtime.ts';
import { Peer } from './network/peer.ts';

test('failed first merchant save rejects admission safely and a later join retries', async (t) => {
  const runtime = await createRuntime();
  const messages: ServerMessage[] = [];
  const peer = new Peer(
    (message) => messages.push(message),
    () => {},
  );
  try {
    runtime.connect(peer);
    const world = [...runtime.worlds.values()][0];
    const failure = t.mock.method(runtime.characters, 'saveMerchant', () => {
      throw new Error('disk full');
    });
    const join = { type: 'join', worldId: world.id, playerName: 'Buyer', password: '' };
    peer.receive(join);
    assert.equal(world.players.size, 0);
    assert.equal(world.merchant, undefined);
    assert.equal(messages.at(-1)?.type, 'error');
    await new Promise((resolve) => setTimeout(resolve, 75));
    assert.equal(failure.mock.callCount(), 1, 'broadcast ticks do not retry admission writes');
    failure.mock.restore();
    peer.receive(join);
    assert.equal(world.players.size, 1);
    assert.deepEqual(runtime.characters.merchant(world.id), world.merchant);
  } finally {
    t.mock.restoreAll();
    await runtime.close();
  }
});

test('empty bottles cost one gold, exhaust shared stock, and stack to 200', () => {
  const merchant = freshMerchant(1000);
  const player = { ...freshProgress(), id: 'p', name: 'Buyer', x: 0, y: 0, color: 0 } as Player;
  player.coins = 201;
  player.backpack = [{ id: 'bottle', itemId: 'empty-bottle', quantity: 1 }];
  const bottle = merchant.backpack.find((item) => item.itemId === 'empty-bottle')!;
  assert.equal(bottle.quantity, 200);
  assert.equal(itemDefinition(bottle.itemId).kind, 'resource');
  for (let i = 0; i < 200; i++) tradeItem(player, merchant, bottle.id, true);
  assert.equal(player.coins, 1);
  assert.equal(merchant.coins, 5200);
  assert.deepEqual(
    player.backpack.map((item) => item.quantity),
    [200, 1],
  );
  assert(backpackSchema.safeParse(player.backpack).success);
  assert.throws(() => tradeItem(player, merchant, bottle.id, true), /available/);
});

test('stock refresh saves before publishing, preserves buybacks and survives a reload', async (t) => {
  const store = new CharacterStore(':memory:');
  await store.ready;
  try {
    const world: { id: string; merchant: Merchant; chat?: ChatMessage[] } = {
      id: 'world',
      merchant: freshMerchant(1000),
      chat: [],
    };
    store.saveWorld({ id: world.id, name: 'Test', salt: '' });
    const initial = store.merchant(world.id);
    assert.deepEqual(store.merchant(world.id), initial, 'initial deadline persists before a trade');
    world.merchant.backpack = [];
    world.merchant.coins = 12;
    world.merchant.craftsman!.coins = 7;
    world.merchant.craftsman!.backpack = [];
    world.merchant.craftsman!.buyback = [{ id: 'bram-sold', itemId: 'loot-boots', quantity: 1 }];
    world.merchant.buyback = [{ id: 'sold', itemId: 'loot-helmet', quantity: 1 }];
    store.saveMerchant(world.id, world.merchant);
    const due = world.merchant.refreshAt!;
    refreshMerchant(world, store, due - 1);
    assert.equal(world.chat?.length, 0);
    const before = structuredClone(world);
    const failure = t.mock.method(store, 'saveMerchant', () => {
      throw new Error('disk full');
    });
    assert.throws(() => refreshMerchant(world, store, due), /disk full/);
    assert.deepEqual(world, before);
    failure.mock.restore();
    refreshMerchant(world, store, due + RUNTIME.autosaveMs - 1);
    assert.deepEqual(world, before, 'failed refresh waits before retrying');
    const refreshedAt = due + RUNTIME.autosaveMs;
    refreshMerchant(world, store, refreshedAt);
    assert.equal(world.merchant.coins, 5000);
    assert.deepEqual(
      world.merchant.backpack.map((item) => [item.itemId, item.quantity]),
      [
        ['health-potion', 5],
        ['empty-bottle', 200],
      ],
    );
    assert.deepEqual(world.merchant.buyback, before.merchant.buyback);
    assert.equal(world.merchant.craftsman!.coins, 5000);
    assert.deepEqual(world.merchant.craftsman!.buyback, before.merchant.craftsman!.buyback);
    assert.deepEqual(
      world.merchant.craftsman!.backpack.map((item) => item.itemId),
      LOOT_ITEM_IDS,
    );
    assert.equal(world.chat?.length, 2);
    assert.equal(world.chat![0].playerId, '');
    assert.match(world.chat![0].text, /Marta.*refreshed her stock/);
    world.merchant = store.merchant(world.id);
    assert.equal(world.merchant.refreshAt, refreshedAt + 30 * 60 * 1000);
    refreshMerchant(world, store, due + 1);
    assert.equal(world.chat?.length, 2);
    refreshMerchant(world, store, due + 3 * 30 * 60 * 1000);
    assert.equal(world.chat?.length, 4, 'missed intervals produce only one refresh');
    delete world.merchant.refreshAt;
    store.saveMerchant(world.id, world.merchant);
    world.merchant = store.merchant(world.id);
    refreshMerchant(world, store, due + 3 * 30 * 60 * 1000);
    assert.equal(world.chat?.length, 6, 'legacy stock receives a deadline on refresh');
  } finally {
    store.close();
  }
});

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
  const prices = Object.values(Rarity).map((rarity) =>
    itemPrice({
      itemId: 'loot-helmet',
      rarity,
      stats: rollItemStats('helmet', rarity, () => 0.5),
    }),
  );
  assert(prices.every((price, i) => Number.isSafeInteger(price) && price > (prices[i - 1] ?? 1)));
  assert.equal(itemPrice({ itemId: 'empty-bottle' }), 1);
  assert.equal(itemPrice({ itemId: 'health-potion' }), 1);
  assert.equal(itemPrice({ itemId: 'loot-helmet' }), 1);
  const priced = (stats: Record<string, number>) =>
    itemPrice({ itemId: 'warrior-sword', rarity: Rarity.Legendary, stats });
  assert.equal(priced({ [ItemStat.Power]: 2 }), priced({ [ItemStat.MaximumHealth]: 10 }));
  assert(priced({ [ItemStat.Power]: 2 }) > priced({ [ItemStat.Power]: 1 }));
  assert(priced({ [ItemStat.AdditionalAttack]: 1 }) > priced({ [ItemStat.Power]: 2 }));
});

test('Bram uses authoritative prices, rejects another shop IDs and failed saves, and persists buyback', async (t) => {
  const runtime = await createRuntime();
  const messages: ServerMessage[] = [];
  const peer = new Peer(
    (message) => messages.push(message),
    () => {},
  );
  try {
    runtime.connect(peer);
    const world = [...runtime.worlds.values()][0];
    peer.receive({ type: 'join', worldId: world.id, playerName: 'Gear buyer', password: '' });
    const player = [...world.players.values()][0];
    const bram = world.npcs!.find((npc) => npc.id === 'craftsman')!;
    Object.assign(bram, { x: 1000, y: 1000 });
    Object.assign(
      world.npcs!.find((npc) => npc.id === 'innkeeper')!,
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
  const total = player.backpack.reduce((sum, item) => sum + itemPrice(item), 0);
  sellAll(player, merchant);
  assert.equal(player.coins, total);
  assert.equal(merchant.coins, 5000 - total);
  // Snapshot the queue because each purchase removes its entry.
  // oxlint-disable-next-line unicorn/no-useless-spread
  for (const entry of [...merchant.buyback]) tradeItem(player, merchant, entry.id, true);
  assert.equal(player.coins, 0);
  assert.equal(merchant.coins, 5000);
});
