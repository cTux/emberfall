import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  clientMessage,
  freshStorages,
  storagesSchema,
  transferStoredItem,
  moveStorageItem,
} from '@emberfall/core';

import { decodeProgress, freshProgress } from './characters.ts';

import { item, hero } from './storehouse.fixture.ts';

test('three bounded storages transfer whole stacks, conserve items and reject stale/full destinations', () => {
  const player = hero();
  player.backpack = [item('health-potion', 5)];
  const id = player.backpack[0].id;
  transferStoredItem(player, 2, id, true);
  assert.equal(player.backpack.length, 0);
  assert.equal(player.storages![2].items[0].quantity, 5);
  assert.throws(() => {
    return transferStoredItem(player, 2, id, true);
  }, /available/);
  player.backpack = Array.from({ length: 20 }, () => {
    return item();
  });
  const before = structuredClone(player);
  assert.throws(() => {
    return transferStoredItem(player, 2, id, false);
  }, /full/);
  assert.deepEqual(player, before);
  player.backpack = [item('health-potion', 3)];
  player.storages![2].items.push(
    ...Array.from({ length: 39 }, () => {
      return item();
    }),
  );
  transferStoredItem(player, 2, player.backpack[0].id, true);
  assert.equal(player.storages![2].items.length, 40);
  assert.equal(player.storages![2].items[0].quantity, 8);
  player.backpack = [item()];
  assert.throws(() => {
    return transferStoredItem(player, 2, player.backpack![0].id, true);
  }, /full/);
  assert.equal(player.backpack.length, 1);
  player.backpack = Array.from({ length: 19 }, () => {
    return item();
  });
  player.backpack.push(item('health-potion', 2));
  transferStoredItem(player, 2, id, false);
  assert.equal(player.backpack.length, 20);
  assert.equal(player.backpack.at(-1)!.quantity, 10);
  assert.equal(player.storages![2].items.length, 39);
});

test('storage schemas bound tabs, slots, names and identities; legacy progress gets empty storages', () => {
  for (const tab of [-1, 3, 0.5]) {
    assert.equal(
      clientMessage.safeParse({ type: 'storeItem', tab, id: 'x', depositing: true }).success,
      false,
    );
    assert.equal(
      clientMessage.safeParse({ type: 'renameStorage', tab, name: 'Gear' }).success,
      false,
    );
  }

  for (const name of ['', '  ', 'bad\nname', 'bad\u200bname']) {
    assert.equal(clientMessage.safeParse({ type: 'renameStorage', tab: 0, name }).success, false);
  }

  const rename = clientMessage.parse({ type: 'renameStorage', tab: 0, name: ' Gear ' });
  assert.equal(rename.type === 'renameStorage' && rename.name, 'Gear');
  const longName = 'Storage supplies '.repeat(100);
  const longRename = clientMessage.parse({ type: 'renameStorage', tab: 0, name: longName });
  assert.equal(longRename.type === 'renameStorage' && longRename.name, longName.trim());
  const longStorages = freshStorages();
  longStorages[0].name = longName.trim();
  assert.deepEqual(storagesSchema.parse(JSON.parse(JSON.stringify(longStorages))), longStorages);
  assert.equal(storagesSchema.safeParse(freshStorages().slice(1)).success, false);
  const storages = freshStorages();
  storages[0].items = Array.from({ length: 41 }, () => {
    return item();
  });
  assert.equal(storagesSchema.safeParse(storages).success, false);
  storages[0].items = [item()];
  storages[1].items = [...storages[0].items];
  assert.equal(storagesSchema.safeParse(storages).success, false);
  const legacy = { ...freshProgress(), storages: undefined };
  assert.deepEqual(decodeProgress(JSON.stringify(legacy)).progress.storages, freshStorages());
});

test('storage-to-storage moves conserve stacks, validate tabs and reject full or stale destinations', () => {
  const player = hero();
  const potion = item('health-potion', 5);
  player.storages![0].items = [potion];
  player.storages![1].items = [
    item('health-potion', 2),
    ...Array.from({ length: 39 }, () => {
      return item();
    }),
  ];
  moveStorageItem(player, 0, 1, potion.id);
  assert.equal(player.storages![0].items.length, 0);
  assert.equal(player.storages![1].items.length, 40);
  assert.equal(player.storages![1].items[0].quantity, 7);
  assert.throws(() => {
    return moveStorageItem(player, 0, 1, potion.id);
  }, /available/);
  player.storages![0].items = [item()];
  const before = structuredClone(player);
  assert.throws(() => {
    return moveStorageItem(player, 0, 1, player.storages![0].items[0].id);
  }, /full/);

  for (const [fromTab, toTab] of [
    [0, 0],
    [-1, 1],
    [0, 3],
    [0.5, 1],
  ]) {
    assert.throws(() => {
      return moveStorageItem(player, fromTab, toTab, player.storages![0].items[0].id);
    }, /different/);
  }

  assert.deepEqual(player, before);

  for (const [fromTab, toTab] of [
    [-1, 1],
    [0, 3],
    [0.5, 1],
  ]) {
    assert.equal(
      clientMessage.safeParse({ type: 'moveStorageItem', fromTab, toTab, id: 'x' }).success,
      false,
    );
  }
});
