import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  Rarity,
  ItemStat,
  characterStats,
  useBackpackItem,
  unequipItem,
  transferStoredItem,
  moveStorageItem,
  freshMerchant,
  tradeItem,
  sellAll,
  talentCooldownMs,
  improveItem,
} from '@emberfall/core';

import { CharacterStore, decodeProgress } from './characters.ts';
import { hero, instance, equip } from './item-rolls.fixture.ts';

test('exact rolls survive equip replacement, storage, sale, buyback, class switches and SQLite restart', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'emberfall-rolls-'));
  const path = join(directory, 'save.sqlite');
  let store = new CharacterStore(path);
  await store.ready;
  try {
    const saved = store.create('Roll owner');
    const player = { ...hero(), ...saved.progress, id: saved.id, name: saved.name };
    const item = instance('warrior-sword', ItemStat.AdditionalAttack);
    player.backpack = [item];
    player.coins = 10;
    improveItem(player, item.id, 0);
    useBackpackItem(player, item.id);
    assert.deepEqual(player.equipmentItems!.weapon, item);
    const replacement = instance('warrior-sword', ItemStat.CriticalChance, Rarity.Uncommon);
    player.backpack.push(replacement);
    useBackpackItem(player, replacement.id);
    assert.deepEqual(
      player.backpack.find((entry) => {
        return entry.id === item.id;
      }),
      item,
    );
    transferStoredItem(player, 0, item.id, true);
    moveStorageItem(player, 0, 1, item.id);
    transferStoredItem(player, 1, item.id, false);
    player.coins = 100;
    const world = { id: crypto.randomUUID(), name: 'Roll world', salt: '' };
    store.saveWorld(world, true);
    const merchant = freshMerchant();
    tradeItem(player, merchant, item.id, false);
    assert.deepEqual(merchant.buyback[0].stats, item.stats);
    tradeItem(player, merchant, merchant.buyback[0].id, true);
    assert.deepEqual(player.backpack.at(-1)!.stats, item.stats);
    unequipItem(player, 'weapon');
    useBackpackItem(
      player,
      player.backpack.find((entry) => {
        return entry.rarity === Rarity.Legendary;
      })!.id,
    );
    sellAll(player, merchant);
    assert.deepEqual(player.equipmentItems!.weapon.stats, item.stats);
    store.save(saved.id, saved.name, player, { worldId: world.id, state: merchant });
    store.selectClass(saved.id, player, 'mage');
    assert.equal(
      player.equipmentItems,
      undefined,
      'previous class rolls cannot leak into another class',
    );
    store.selectClass(saved.id, player, 'warrior');
    assert.deepEqual(player.equipmentItems!.weapon.stats, item.stats);
    store.close();
    store = new CharacterStore(path);
    await store.ready;
    const reloaded = store.load(saved.token);
    assert.equal(reloaded.progress.equipmentItems!.weapon.stars, 1);
    assert.deepEqual(reloaded.progress.equipmentItems!.weapon.stats, item.stats);
    assert.deepEqual(store.merchant(world.id).buyback, merchant.buyback);
    assert.deepEqual(
      decodeProgress(JSON.stringify(reloaded.progress)).progress.equipmentItems,
      reloaded.progress.equipmentItems,
    );
  } finally {
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('flat and percentage bonuses sum across equipment with exact fractional attack speed and cooldown recovery', () => {
  const player = hero();
  equip(player, 'weapon', 'warrior-sword', ItemStat.Power);
  equip(player, 'offHand', 'loot-shield', ItemStat.Armor);
  equip(player, 'helmet', 'loot-helmet', ItemStat.MaximumHealth);
  const ring = instance('loot-ring', ItemStat.AttackSpeed, Rarity.Uncommon);
  player.equipment!.ring = ring.itemId;
  player.equipmentItems!.ring = ring;
  const stats = characterStats(player);
  assert.equal(stats.power, 9);
  assert.equal(stats.armor, 7);
  assert.equal(stats.maxHitpoints, 120);
  assert.equal(stats.attacksPerSecond, 1.064);
  assert.equal(stats.attackIntervalMs, 1000 / 1.064);
  assert.equal(talentCooldownMs(player, 0), 6000 / 1.064);
});
