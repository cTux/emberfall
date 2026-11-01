import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ANVIL,
  FOREST,
  anvilInRange,
  backpackSchema,
  characterStats,
  clientMessage,
  improveItem,
  improvableItems,
  useBackpackItem,
  unequipItem,
  transferStoredItem,
  tradeItem,
  freshMerchant,
  ItemStat,
  Rarity,
} from '@emberfall/core';
import { decodeProgress, CharacterStore } from './characters.ts';
import { hero, item } from './inventory.fixture.ts';
import { instance } from './item-rolls.fixture.ts';
import { commitCharacterCommand } from './commands/character.ts';

test('five improvements charge exact prices, scale base and rolled stats additively and preserve rolls', () => {
  const player = hero();
  player.coins = 210;
  const gear = instance('loot-helmet', ItemStat.MaximumHealth, Rarity.Uncommon);
  player.backpack = [gear];
  const original = structuredClone(gear);

  for (const [stars, price] of [10, 20, 30, 50, 100].entries()) {
    const beforeCoins: number = player.coins;
    improveItem(player, gear.id, stars);
    assert.equal(player.coins, beforeCoins - price);
    assert.equal(gear.stars, stars + 1);
    assert.deepEqual(gear.stats, original.stats);
    assert.equal(backpackSchema.safeParse([gear]).success, true);
  }

  assert.equal(player.coins, 0);
  useBackpackItem(player, gear.id);
  const stats = characterStats(player);
  assert.equal(stats.armor, 1.5);
  assert.equal(stats.maxHitpoints, 100 + original.stats!.maximumHealth * 1.5);
  assert.equal(player.hitpoints, 100, 'increasing maximum health does not grant healing');
  assert.deepEqual(decodeProgress(JSON.stringify(player)).progress.equipmentItems!.helmet, gear);
});

test('legacy starter equipment gains an instance and all weapon stats scale without changing definitions', () => {
  const player = hero();
  player.coins = 210;
  const baseline = characterStats(player);
  const entry = improvableItems(player).find((entry) => {
    return entry.slot === 'weapon';
  })!;
  improveItem(player, entry.item.id, 0, 'weapon');
  const id = player.equipmentItems!.weapon.id;

  for (let stars = 1; stars < 5; stars++) {
    improveItem(player, id, stars, 'weapon');
  }

  const stats = characterStats(player);

  for (const key of [
    'power',
    'range',
    'manualRange',
    'attacksPerSecond',
    'criticalChance',
    'criticalMultiplier',
  ] as const) {
    assert.equal(stats[key], baseline[key] * 1.5, key);
  }

  assert.equal(characterStats(hero()).power, baseline.power);
  assert.equal(player.equipmentItems!.weapon.id, id);
});

test('invalid, stale, duplicate, capped and unaffordable upgrades leave ownership and gold unchanged', () => {
  const player = hero();
  player.coins = 10;
  const gear = item('loot-helmet');
  player.backpack = [gear, item('health-potion')];
  const rejects = (id: string, stars: number, error: RegExp, slot?: string) => {
    const before = structuredClone(player);
    assert.throws(() => {
      improveItem(player, id, stars, slot);
    }, error);
    assert.deepEqual(player, before);
  };

  rejects('missing', 0, /changed/);
  rejects(player.backpack[1].id, 0, /changed/);
  rejects(gear.id, -1, /changed/);
  rejects(gear.id, 0.5, /changed/);
  rejects(gear.id, 0, /changed/, 'missing');
  improveItem(player, gear.id, 0);
  rejects(gear.id, 0, /changed/);
  rejects(gear.id, 1, /gold/);
  Object.assign(gear, { stars: 5 });
  rejects(gear.id, 5, /five stars/);

  for (const stars of [-1, 0.5, 6]) {
    assert.equal(backpackSchema.safeParse([{ ...gear, stars }]).success, false);
    assert.equal(
      clientMessage.safeParse({ type: 'improveItem', id: gear.id, stars }).success,
      false,
    );
  }

  assert.equal(backpackSchema.safeParse([{ ...player.backpack[1], stars: 1 }]).success, false);
});

test('anvil reach uses living village players and wrapped feet coordinates', () => {
  const player = { ...hero(), x: ANVIL!.x, y: ANVIL!.y - 15 };
  assert.equal(anvilInRange(player), true);
  assert.equal(anvilInRange({ ...player, x: player.x + FOREST.width }), true);
  assert.equal(anvilInRange({ ...player, x: player.x + 68 }), false);
  assert.equal(anvilInRange({ ...player, scene: 'forest' }), false);
  assert.equal(anvilInRange({ ...player, hitpoints: 0 }), false);
});

test('upgrade saves before publication and stars survive transfers, class changes and reload', async (t) => {
  const store = new CharacterStore(':memory:');
  await store.ready;
  try {
    const saved = store.create('Smith');
    const player = { ...hero(), ...saved.progress };
    player.coins = 100;
    const gear = item('loot-helmet');
    player.backpack = [gear];
    const world = { id: 'anvil-world', name: 'Anvil', salt: '' };
    store.saveWorld(world, true);
    const command = { type: 'improveItem', id: gear.id, stars: 0 } as const;
    const before = structuredClone(player);
    const failed = t.mock.method(store, 'save', () => {
      throw new Error('disk failure');
    });
    assert.throws(() => {
      commitCharacterCommand(command, player, world, saved.id, store);
    }, /Unable to save/);
    assert.deepEqual(player, before);
    failed.mock.restore();
    commitCharacterCommand(command, player, world, saved.id, store);
    assert.equal(player.backpack[0].stars, 1);
    assert.equal(player.coins, 90);
    useBackpackItem(player, gear.id);
    unequipItem(player, 'helmet');
    transferStoredItem(player, 0, gear.id, true);
    transferStoredItem(player, 0, gear.id, false);
    const merchant = freshMerchant();
    tradeItem(player, merchant, gear.id, false);
    tradeItem(player, merchant, merchant.buyback[0].id, true);
    assert.equal(player.backpack.at(-1)!.stars, 1);
    useBackpackItem(player, player.backpack.at(-1)!.id);
    store.save(saved.id, saved.name, player);
    store.selectClass(saved.id, player, 'mage');
    store.selectClass(saved.id, player, 'warrior');
    assert.equal(player.equipmentItems!.helmet.stars, 1);
    assert.equal(store.load(saved.token).progress.equipmentItems!.helmet.stars, 1);
  } finally {
    store.close();
  }
});
