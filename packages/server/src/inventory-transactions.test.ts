import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ServerMessage } from '@emberfall/common';
import { tradeItem, INNKEEPER } from '@emberfall/core';

import { CharacterStore } from './characters.ts';
import { createRuntime } from './runtime.ts';
import { Peer } from './network/peer.ts';
import { hero, item } from './inventory.fixture.ts';

test('trade save survives restart and rolls both owners back on failed validation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'emberfall-inventory-'));
  const path = join(directory, 'save.sqlite');
  let store = new CharacterStore(path);
  await store.ready;
  try {
    const saved = store.create('Trader');
    const worldId = crypto.randomUUID();
    store.saveWorld({ id: worldId, name: 'World', salt: '' }, true);
    const player = { ...hero(), ...saved.progress };
    player.backpack = [item('loot-helmet')];
    const merchant = store.merchant(worldId);
    tradeItem(player, merchant, player.backpack[0].id, false);
    store.save(saved.id, player.name, player, { worldId, state: merchant });
    const bad = { ...player, coins: 999 };
    assert.throws(() => {
      return store.save(saved.id, player.name, bad, { worldId, state: { ...merchant, coins: -1 } });
    });
    assert.equal(store.load(saved.token).progress.coins, 1);
    assert.equal(store.merchant(worldId).coins, 4999);
    store.close();
    store = new CharacterStore(path);
    await store.ready;
    assert.equal(store.load(saved.token).progress.coins, 1);
    assert.equal(
      store.merchant(worldId).buyback.find((entry) => {
        return entry.itemId === 'loot-helmet';
      })?.quantity,
      1,
    );
    assert.equal(store.merchant(worldId).coins, 4999);
  } finally {
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('session-owned commands reject remote trading and retain live items after a failed save', async (t) => {
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
    peer.receive({ type: 'join', worldId: world.id, playerName: 'Trader', password: '' });
    for (let i = 0; i < 200 && !world.players.size; i++) {
      await new Promise((resolve) => {
        return setTimeout(resolve, 10);
      });
    }

    assert.equal(world.players.size, 1);
    const player = [...world.players.values()][0];
    player.backpack = [item('loot-helmet')];
    peer.receive({ type: 'sellAll' });
    assert.match((messages.at(-1) as { message: string }).message, /Trade near Marta/);
    assert.equal(player.backpack.length, 1);
    player.x = INNKEEPER.x;
    player.y = INNKEEPER.y - 15;
    const before = structuredClone(player);
    const failSave = t.mock.method(runtime.characters, 'save', () => {
      throw new Error('Test database failure');
    });
    peer.receive({ type: 'sellAll' });
    assert.match((messages.at(-1) as { message: string }).message, /Unable to save/);
    assert.deepEqual(player, before);
    assert.equal(world.merchant!.coins, 5000);
    assert.equal(world.merchant!.backpack.length, 2);
    failSave.mock.restore();
    peer.receive({ type: 'trade', id: player.backpack[0].id, buying: false, coins: 99999 });
    assert.equal(player.backpack.length, 0);
    assert.equal(player.coins, 1, 'wire currency cannot override the server calculation');
    const soldId = world.merchant!.buyback.find((entry) => {
      return entry.itemId === 'loot-helmet';
    })!.id;
    peer.receive({ type: 'trade', id: soldId, buying: true });
    peer.receive({ type: 'trade', id: soldId, buying: true });
    assert.match((messages.at(-1) as { message: string }).message, /no longer available/);
    assert.equal(player.backpack.length, 1);
    assert.equal(player.coins, 0);
    assert.equal(world.merchant!.coins, 5000);
  } finally {
    t.mock.restoreAll();
    await runtime.close();
  }
});
