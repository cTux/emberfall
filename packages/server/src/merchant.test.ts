import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  freshMerchant,
  tradeItem,
  backpackSchema,
  itemDefinition,
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
    (message) => {
      return messages.push(message);
    },
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
    await new Promise((resolve) => {
      return setTimeout(resolve, 75);
    });
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
  const bottle = merchant.backpack.find((item) => {
    return item.itemId === 'empty-bottle';
  })!;
  assert.equal(bottle.quantity, 200);
  assert.equal(itemDefinition(bottle.itemId).kind, 'resource');

  for (let i = 0; i < 200; i++) {
    tradeItem(player, merchant, bottle.id, true);
  }

  assert.equal(player.coins, 1);
  assert.equal(merchant.coins, 5200);
  assert.deepEqual(
    player.backpack.map((item) => {
      return item.quantity;
    }),
    [200, 1],
  );
  assert(backpackSchema.safeParse(player.backpack).success);
  assert.throws(() => {
    return tradeItem(player, merchant, bottle.id, true);
  }, /available/);
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
    assert.throws(() => {
      return refreshMerchant(world, store, due);
    }, /disk full/);
    assert.deepEqual(world, before);
    failure.mock.restore();
    refreshMerchant(world, store, due + RUNTIME.autosaveMs - 1);
    assert.deepEqual(world, before, 'failed refresh waits before retrying');
    const refreshedAt = due + RUNTIME.autosaveMs;
    refreshMerchant(world, store, refreshedAt);
    assert.equal(world.merchant.coins, 5000);
    assert.deepEqual(
      world.merchant.backpack.map((item) => {
        return [item.itemId, item.quantity];
      }),
      [
        ['health-potion', 5],
        ['empty-bottle', 200],
      ],
    );
    assert.deepEqual(world.merchant.buyback, before.merchant.buyback);
    assert.equal(world.merchant.craftsman!.coins, 5000);
    assert.deepEqual(world.merchant.craftsman!.buyback, before.merchant.craftsman!.buyback);
    assert.deepEqual(
      world.merchant.craftsman!.backpack.map((item) => {
        return item.itemId;
      }),
      LOOT_ITEM_IDS,
    );
    assert.equal(world.chat?.length, 2);
    assert.equal(world.chat[0].playerId, '');
    assert.match(world.chat[0].text, /Marta.*refreshed her stock/);
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
