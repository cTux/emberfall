import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CharacterStore } from './characters.ts';
import {
  nearbyInteraction,
  WARDROBE,
  clientMessage,
  spawnArchetype,
  enemyMaxHealth,
} from '@emberfall/core';

import { hero } from './classes.fixture.ts';

// Base-damage scenarios exclude random criticals; equipment-damage.test.ts covers their boundaries.
beforeEach((t) => {
  if ('mock' in t) t.mock.method(Math, 'random', () => 0.5);
});

test('class records migrate legacy progress, save independently, and survive restart', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'emberfall-classes-'));
  const file = join(directory, 'save.sqlite');
  let store = new CharacterStore(file);
  await store.ready;
  try {
    const created = store.create('Hero');
    store.save(created.id, 'Hero', {
      ...created.progress,
      level: 4,
      experience: 234,
      coins: 13,
      talents: { strength: 2 },
    });
    const old = store.load(created.token);
    assert.equal(old.classId, 'warrior');
    const player = { ...hero(), ...old.progress, classId: old.classId, classes: old.classes };
    store.selectClass(old.id, player, 'ranger');
    assert.equal(player.level, 1);
    assert.equal(player.coins, 13, 'account gold follows the class switch');
    assert.deepEqual(player.talents, {});
    player.experience = 17;
    player.coins = 3;
    store.selectClass(old.id, player, 'mage');
    player.experience = 9;
    store.save(old.id, player.name, player);
    store.close();
    store = new CharacterStore(file);
    await store.ready;
    const restored = store.load(created.token);
    assert.equal(restored.classId, 'mage');
    assert.equal(restored.progress.experience, 9);
    assert.equal(restored.classes.ranger.experience, 17);
    assert.equal(restored.progress.coins, 3);
    assert.equal(restored.classes.ranger.coins, undefined);
    assert.equal(restored.classes.warrior.coins, undefined);
    assert.equal(restored.classes.warrior.experience, 234);
    assert.deepEqual(restored.classes.warrior.talents, {});
    assert.equal(restored.classes.druid.maxHitpoints, 100);
    store.selectClass(old.id, player, 'druid');
    player.experience = 42;
    store.save(old.id, player.name, player);
    assert.equal(store.load(created.token).classes.druid.experience, 42);
    store.selectClass(old.id, player, 'warrior');
    assert.equal(player.level, 4);
    assert.equal(player.experience, 234);
    assert.equal(player.coins, 3);
  } finally {
    store.close();
    rmSync(directory, { recursive: true });
  }
});

test('class selection schema and wardrobe interaction reject invalid classes and dead players', async () => {
  assert(!clientMessage.safeParse({ type: 'selectClass', classId: 'hacker' }).success);
  const player = { ...hero(), scene: undefined, x: WARDROBE.x + 40, y: WARDROBE.y - 15 };
  assert.equal(nearbyInteraction(player)?.id, 'wardrobe');
  assert.equal(nearbyInteraction({ ...player, hitpoints: 0 }), null);
});

test('one spawn roll gives exactly ten percent big and ten percent ranged with health multipliers', async () => {
  const types = Array.from({ length: 100 }, (_, i) => spawnArchetype(i / 100, i));
  assert.equal(types.filter((a) => a === 'brute').length, 10);
  assert.equal(types.filter((a) => a === 'caster').length, 10);
  assert.equal(enemyMaxHealth({ archetype: 'brute' }), 30);
  assert.equal(enemyMaxHealth({ archetype: 'caster' }), 7);
  assert.equal(enemyMaxHealth({ archetype: 'brute', kind: 'elite' }), 90);
  assert.equal(enemyMaxHealth({ archetype: 'caster', kind: 'elite' }), 21);
  assert.equal(enemyMaxHealth({ archetype: 'brute', kind: 'boss' }), 300);
});
