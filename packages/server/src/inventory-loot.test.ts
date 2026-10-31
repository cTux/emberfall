import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  INVENTORY_SLOTS,
  LOOT_ITEM_IDS,
  GEAR_DEFINITIONS,
  createTrainingScene,
  stepCombat,
  hitEnemy,
} from '@emberfall/core';

import { hero, item } from './inventory.fixture.ts';

test('full players leave item drops for nearby players while still collecting gold', (t) => {
  t.mock.method(Math, 'random', () => {
    return 0;
  });
  const player = {
    ...hero(),
    scene: 'forest' as const,
    backpack: Array.from({ length: INVENTORY_SLOTS }, () => {
      return item('loot-boots');
    }),
  };
  const scene = {
    ...createTrainingScene(0),
    training: false,
    enemies: [],
    endsAt: 1e9,
    nextSpawn: 1e9,
  };
  hitEnemy(scene, { id: 1, x: player.x, y: player.y, hitpoints: 1, angle: 0 }, 2, player, 1000);
  stepCombat(scene, [player], 1400, 0.05);
  assert.equal(player.backpack.length, INVENTORY_SLOTS);
  assert.equal(
    scene.drops!.filter((drop) => {
      return drop.kind === 'item';
    }).length,
    1,
  );
  assert((player.coins ?? 0) > 0);
  const second = { ...hero(), id: 'second', scene: 'forest' as const };
  stepCombat(scene, [player, second], 1450, 0.05);
  assert.equal(second.backpack!.length, 1);
  assert.equal(
    scene.drops!.filter((drop) => {
      return drop.kind === 'item';
    }).length,
    0,
  );
});

test('auto-loot off leaves items for others without blocking shared XP or gold', (t) => {
  t.mock.method(Math, 'random', () => {
    return 0;
  });
  const player = { ...hero(), scene: 'forest' as const, autoLoot: false };
  const scene = {
    ...createTrainingScene(0),
    training: false,
    enemies: [],
    endsAt: 1e9,
    nextSpawn: 1e9,
  };
  hitEnemy(scene, { id: 1, x: player.x, y: player.y, hitpoints: 1, angle: 0 }, 2, player, 1000);
  stepCombat(scene, [player], 1400, 0.05);
  assert.equal(player.backpack?.length ?? 0, 0);
  assert(player.experience > 0);
  assert.equal(player.coins, 1);
  assert.equal(scene.drops!.length, 1);
  assert.equal(scene.drops![0].collectorId, undefined);
  const second = { ...hero(), id: 'second', scene: 'forest' as const };
  stepCombat(scene, [player, second], 1450, 0.05);
  assert.equal(second.backpack!.length, 1);
  assert.equal(scene.drops!.length, 0);
});

test('successful item rolls include weapons and preserve rolls across a wrapped pickup; training drops none', (t) => {
  for (const [index, id] of LOOT_ITEM_IDS.entries()) {
    const rolls = [0.5, 0, 0, (index + 0.5) / LOOT_ITEM_IDS.length];
    t.mock.method(Math, 'random', () => {
      return rolls.shift() ?? 0.5;
    });
    const player = hero();
    player.scene = 'forest';
    player.x = 4798;
    player.y = 1280;
    const scene = {
      ...createTrainingScene(0),
      training: false,
      enemies: [],
      endsAt: 1e9,
      nextSpawn: 1e9,
    };
    hitEnemy(scene, { id: 1, x: 8, y: 1280, hitpoints: 1, angle: 0 }, 2, player, 1000);
    const drop = scene.drops!.find((drop) => {
      return drop.kind === 'item';
    })!;
    assert.equal(drop.itemId, id);
    assert(GEAR_DEFINITIONS[id]);
    assert.equal(drop.rarity, 'common');
    assert.equal(Object.keys(drop.stats!).length, 1);
    stepCombat(scene, [player], 1400, 0.05);
    assert.equal(player.backpack!.length, 1);
    assert.deepEqual(player.backpack![0].stats, drop.stats);
    stepCombat(scene, [player], 1450, 0.05);
    assert.equal(player.backpack!.length, 1);
    const training = createTrainingScene(0);
    hitEnemy(training, { id: 1, x: 8, y: 1280, hitpoints: 1, angle: 0 }, 2, player, 1000);
    assert.equal(training.drops?.length ?? 0, 0);
    t.mock.restoreAll();
  }
});
