import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SceneState } from '@emberfall/common';
import {
  CLASS_IDS,
  freshStorages,
  transferStoredItem,
  tradeItem,
  freshMerchant,
  stepCombat,
} from '@emberfall/core';
import { CharacterStore, decodeProgress, freshProgress } from './characters.ts';

import { item, hero } from './storehouse.fixture.ts';

test('account storage and collected gold survive class changes and restart without sharing between accounts', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'emberfall-storage-'));
  const path = join(directory, 'characters.sqlite');
  let store = new CharacterStore(path);
  try {
    await store.ready;
    const saved = store.create('Keeper');
    const player = { ...hero(), ...saved.progress, classId: saved.classId, classes: saved.classes };
    player.storages[1].name = 'Armor';
    player.coins = 13;
    player.backpack = [item()];
    transferStoredItem(player, 1, player.backpack[0].id, true);
    store.save(saved.id, player.name, player);
    store.selectClass(saved.id, player, 'mage');
    assert.equal(player.storages[1].name, 'Armor');
    assert.equal(player.storages[1].items.length, 1);
    assert.equal(player.coins, 13);
    const scene: SceneState = {
      id: 'account-loot',
      type: 'Forest',
      difficulty: 'Easy',
      phase: 'active',
      ready: [],
      countdownAt: null,
      endsAt: 100000,
      nextSpawn: Infinity,
      sequence: 0,
      enemies: [],
      damage: [],
      portals: [],
      drops: [{ id: 1, kind: 'gold', x: player.x, y: player.y, at: 0 }],
    };
    player.scene = 'forest';
    stepCombat(scene, [player], 1000, 0);
    assert.equal(player.coins, 14, 'collected gold credits the live account balance');
    delete player.scene;
    const merchant = freshMerchant();
    tradeItem(player, merchant, merchant.backpack[0].id, true);
    assert.equal(player.coins, 13, 'purchases spend the same shared balance');
    transferStoredItem(player, 1, player.storages[1].items[0].id, false);
    assert(
      player.backpack.some((entry) => {
        return entry.itemId === 'loot-helmet';
      }),
    );
    transferStoredItem(
      player,
      1,
      player.backpack.find((entry) => {
        return entry.itemId === 'loot-helmet';
      })!.id,
      true,
    );
    store.selectClass(saved.id, player, 'warrior');
    assert.equal(player.storages[1].items.length, 1);
    const other = store.create('Other');
    assert.deepEqual(other.progress.storages, freshStorages());
    store.close();
    store = new CharacterStore(path);
    await store.ready;
    const restored = store.load(saved.token);
    assert.equal(restored.progress.storages[1].name, 'Armor');
    assert.equal(restored.progress.storages[1].items.length, 1);
    assert.equal(restored.progress.backpack!.length, 0);
    assert.equal(restored.progress.coins, 13);
    assert.equal(restored.classes.warrior.storages, undefined);
    assert.equal(restored.classes.mage.coins, undefined);
    const document = (await store.database.saves.load(saved.id))!.data as {
      formatVersion: number;
      storehouse: { coins: number };
      classes: Record<string, object>;
    };
    assert.equal(document.formatVersion, 2);
    assert.equal(document.storehouse.coins, 13);
    assert(!JSON.stringify(document.classes).includes('storages'));
  } finally {
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('legacy class gold and full storages migrate once without losing overflow items', async () => {
  const store = new CharacterStore(':memory:');
  await store.ready;
  try {
    const saved = store.create('Migrating account');
    const classes = Object.fromEntries(
      CLASS_IDS.map((id, index) => {
        const progress = freshProgress(id);
        progress.coins = index + 1;
        progress.backpack = [item('loot-boots')];
        progress.storages = freshStorages().map((_storage, tab) => {
          return {
            name: `${id} ${tab + 1}`,
            items: Array.from({ length: 40 }, () => {
              return item();
            }),
          };
        });

        return [id, progress];
      }),
    );
    const document = (await store.database.saves.load(saved.id))!;
    await store.database.saves.save(
      saved.id,
      { formatVersion: 1, classId: 'mage', classes },
      0,
      document.version,
    );
    const migrated = store.load(saved.token);
    assert.equal(migrated.progress.coins, 10);
    assert.equal(migrated.progress.storages[0].name, 'mage 1');
    for (const storage of migrated.progress.storages) {
      assert.equal(storage.items.length, 40);
    }

    for (const id of CLASS_IDS) {
      assert.equal(migrated.classes[id].backpack!.length, id === 'mage' ? 1 : 121);
    }

    const ids = [
      ...migrated.progress.storages.flatMap((storage) => {
        return storage.items.map((entry) => {
          return entry.id;
        });
      }),
      ...Object.values(migrated.classes).flatMap((progress) => {
        return progress.backpack!.map((entry) => {
          return entry.id;
        });
      }),
    ];
    assert.equal(ids.length, 484);
    assert.equal(new Set(ids).size, 484);
    store.save(saved.id, saved.name, {
      ...migrated.progress,
      classId: migrated.classId,
      classes: migrated.classes,
    });
    const again = store.load(saved.token);
    assert.deepEqual(again, migrated);
    store.save(saved.id, saved.name, {
      ...again.progress,
      classId: again.classId,
      classes: again.classes,
    });
    assert.deepEqual(store.load(saved.token), migrated);
  } finally {
    store.close();
  }
});

test('migration combines consumables, preserves names and rejects unsafe gold totals or missing account data', () => {
  const classes = Object.fromEntries(
    CLASS_IDS.map((id) => {
      return [id, freshProgress(id)];
    }),
  );
  classes.warrior.storages![0] = { name: 'Gear', items: [item('health-potion', 2)] };
  classes.ranger.storages![0].items = [item('health-potion', 3)];
  const raw = { formatVersion: 1, classId: 'mage', classes };
  const migrated = decodeProgress(JSON.stringify(raw));
  assert.equal(migrated.progress.storages[0].name, 'Gear');
  assert.equal(migrated.progress.storages[0].items.length, 1);
  assert.equal(migrated.progress.storages[0].items[0].quantity, 5);
  classes.warrior.coins = Number.MAX_SAFE_INTEGER;
  classes.ranger.coins = 1;
  assert.throws(() => {
    return decodeProgress(JSON.stringify(raw));
  });
  assert.throws(() => {
    return decodeProgress(JSON.stringify({ ...raw, formatVersion: 2 }));
  });
});
