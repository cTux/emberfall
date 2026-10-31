import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  addItem,
  useBackpackItem,
  unequipItem,
  tradeItem,
  freshMerchant,
  INVENTORY_SLOTS,
  characterStats,
  CLASS_IDS,
  backpackSchema,
  clientMessage,
  createTrainingScene,
  requestPlayerCast,
} from '@emberfall/core';

import { freshProgress, decodeProgress } from './characters.ts';

import { hero, item } from './inventory.fixture.ts';

test('twenty slots reject purchases and unequipping without losing items or gold; stacks and swaps still work', () => {
  const player = hero();
  const merchant = freshMerchant();
  player.coins = 100;
  player.backpack = Array.from({ length: INVENTORY_SLOTS }, () => item('loot-helmet'));
  const before = structuredClone({ player, merchant });
  assert.throws(() => tradeItem(player, merchant, merchant.backpack[0].id, true), /full/);
  assert.throws(() => unequipItem(player, 'weapon'), /full/);
  assert.deepEqual({ player, merchant }, before);
  useBackpackItem(player, player.backpack[0].id);
  addItem(player.backpack, item('health-potion'));
  tradeItem(player, merchant, merchant.backpack[0].id, true);
  assert.equal(player.backpack.length, INVENTORY_SLOTS);
  assert.equal(player.backpack.at(-1)!.quantity, 2);
  useBackpackItem(player, player.backpack[0].id);
  assert.equal(player.backpack.length, INVENTORY_SLOTS);
  const legacy = { ...hero(), backpack: Array.from({ length: 24 }, () => item('loot-helmet')) };
  useBackpackItem(legacy, legacy.backpack[0].id);
  useBackpackItem(legacy, legacy.backpack[0].id);
  assert.equal(legacy.backpack.length, 23);
  assert.equal(decodeProgress(JSON.stringify(legacy)).progress.backpack!.length, 23);
});

test('gear exchange updates totals and weapon removal rejects casts in every class', () => {
  for (const classId of CLASS_IDS) {
    const player = { ...hero(), ...freshProgress(classId), classId };
    player.backpack = Array.from({ length: 18 }, () => item('loot-helmet'));
    useBackpackItem(player, player.backpack[0].id);
    assert.equal(characterStats(player).armor, 1);
    useBackpackItem(player, player.backpack[0].id);
    assert.equal(player.backpack.length, 17, 'replaced helmet goes back into backpack');
    assert.equal(characterStats(player).armor, 1);
    unequipItem(player, 'helmet');
    assert.equal(characterStats(player).armor, 0);
    const weapon = player.equipment!.weapon;
    unequipItem(player, 'weapon');
    assert.equal(characterStats(player).hasWeapon, false);
    const scene = { ...createTrainingScene(0), training: false };
    player.scene = 'forest';
    requestPlayerCast(
      scene,
      player,
      { type: 'cast', id: 1, epoch: scene.id, classId, autoTarget: false, aimX: 2500, aimY: 1280 },
      1000,
    );
    assert.equal(player.attackAt, undefined);
    const backpackWeapon = player.backpack.find((item) => item.itemId === weapon)!;
    useBackpackItem(player, backpackWeapon.id);
    assert.equal(characterStats(player).hasWeapon, true);
    assert.equal(
      requestPlayerCast(
        scene,
        player,
        {
          type: 'cast',
          id: 2,
          epoch: scene.id,
          classId,
          autoTarget: false,
          aimX: 2500,
          aimY: 1280,
        },
        1000,
      ),
      true,
    );
    const incompatible = item(classId === 'warrior' ? 'loot-orb' : 'loot-shield');
    player.backpack.push(incompatible);
    const before = structuredClone(player);
    assert.throws(() => useBackpackItem(player, incompatible.id), /cannot equip/);
    assert.deepEqual(player, before);
  }
});

test('consumables stack, heal one at a time and remain unused at full health', () => {
  const player = hero();
  player.backpack = [];
  addItem(player.backpack, item('health-potion', 3));
  addItem(player.backpack, item('health-potion', 2));
  assert.equal(player.backpack.length, 1);
  assert.equal(player.backpack[0].quantity, 5);
  const id = player.backpack[0].id;
  assert.throws(() => useBackpackItem(player, id), /healing/);
  player.hitpoints = 80;
  useBackpackItem(player, id);
  assert.equal(player.hitpoints, 100);
  assert.equal(player.backpack[0].quantity, 4);
  player.hitpoints = 0;
  assert.throws(() => useBackpackItem(player, id), /healing/);
  assert.equal(player.backpack[0].quantity, 4);
  player.hitpoints = 1;
  for (let i = 0; i < 4; i++) useBackpackItem(player, id);
  assert.equal(player.backpack.length, 0);
});

test('backpack and command validation reject unknown items, forged stacks and duplicates', () => {
  assert.equal(backpackSchema.safeParse([item('missing')]).success, false);
  assert.equal(backpackSchema.safeParse([item('__proto__')]).success, false);
  assert.equal(backpackSchema.safeParse([item('loot-helmet', 2)]).success, false);
  const entry = item('loot-boots');
  assert.equal(backpackSchema.safeParse([entry, entry]).success, false);
  assert.equal(clientMessage.safeParse({ type: 'unequip', slot: 'unknown' }).success, false);
  assert.equal(clientMessage.safeParse({ type: 'trade', id: 'a', buying: 'yes' }).success, false);
  assert.deepEqual(decodeProgress(JSON.stringify(freshProgress())).progress.backpack, []);
});
