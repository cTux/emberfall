import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  randomSource,
  createGame,
  baseMod,
  fireClassAttack,
  advancePlayerShot,
  tickPlayerShots,
  enemyAttributes,
  enemyMaxHealth,
  moveEnemies,
  spawnArchetype,
  tickPlayerCombat,
  stepCombat,
  TRAINING_ZONES,
  createTrainingScene,
} from '@emberfall/core';
import { enemyHitbox } from '@emberfall/core/hitboxes';
import { extensionMod } from '../../core/src/content/tests/fixture.ts';
import { createCharacterPersistence, decodeProgress as decodeBase } from './characters.ts';
import { registeredSlotViews, additionalStatViews } from '../../client/src/content-views.ts';
import type { Player, Enemy } from '@emberfall/common';
import { SessionState, projectState, materializeState } from '@emberfall/common/protocol';

const context = createGame([baseMod, extensionMod]);
const persistence = createCharacterPersistence(context);
const hero = (): Player => {
  return {
    ...persistence.freshProgress('fixture:scout'),
    id: 'p',
    name: 'Scout',
    classId: 'fixture:scout',
    x: 2400,
    y: 1280,
    color: 0,
  };
};

test('an added class/item/slot survives SQLite restart and reaches client views and protocol', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'emberfall-mods-')),
    file = join(directory, 'save.sqlite');
  let store = new persistence.CharacterStore(file);
  await store.ready;
  try {
    const created = store.create('Hero');
    const original = store.load(created.token);
    const player = {
      ...hero(),
      ...original.progress,
      classId: original.classId,
      classes: original.classes,
    };
    store.selectClass(created.id, player, 'fixture:scout');
    assert.equal(player.equipment!.weapon, 'ranger-bow');
    player.equipment!['fixture:charm'] = 'fixture:charm';
    player.experience = 17;
    store.save(created.id, player.name, player);
    store.close();
    store = new persistence.CharacterStore(file);
    await store.ready;
    const restored = store.load(created.token);
    assert.equal(restored.classId, 'fixture:scout');
    assert.equal(restored.classes['fixture:scout'].experience, 17);
    assert.equal(restored.progress.equipment!['fixture:charm'], 'fixture:charm');
    assert.equal(restored.classes.warrior.experience, 0);
    const current = { ...hero(), ...restored.progress };
    assert.deepEqual(additionalStatViews(context.rules.characterStats(current), context), [
      { label: 'Luck', value: '9' },
    ]);
    const slot = registeredSlotViews(context).find((slot) => {
      return slot.id === 'fixture:charm';
    })!;
    assert.equal(slot.label, 'Charm');
    assert.deepEqual(slot.position, { column: 2, row: 5 });
    assert.equal(slot.icon, '/assets/wardrobe-style/slot-offHand.png');
    const state = new SessionState();
    projectState(state, { id: 'world', name: 'World', hostId: 'p', players: [current] });
    assert.equal(materializeState(state)!.players[0].equipment!['fixture:charm'], 'fixture:charm');
    assert.throws(() => {
      return decodeBase(
        JSON.stringify({
          formatVersion: 2,
          classId: 'warrior',
          classes: restored.classes,
          storehouse: restored.storehouse,
        }),
      );
    }, /unknown class 'fixture:scout'/);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
test('registered ability parameters drive authoritative shots, prediction and protocol identity', (t) => {
  t.mock.method(randomSource, 'next', () => {
    return 0.5;
  });
  const player = hero();
  player.autoTarget = false;
  player.aimX = 2600;
  player.aimY = 1280;
  player.attackAt = 1000;
  const scene = createTrainingScene(0);
  scene.enemies = [];
  fireClassAttack(scene, player, 1000, context);
  assert.equal(scene.playerShots!.length, 3);
  assert.deepEqual(
    scene.playerShots!.map((shot) => {
      return shot.abilityId;
    }),
    Array(3).fill('fixture:bolt'),
  );
  assert.equal(scene.playerShots![2].angle - scene.playerShots![1].angle, 0.2);
  const predicted = structuredClone(scene.playerShots![1]);
  advancePlayerShot(predicted, [], 0.5, undefined, false, context);
  assert.equal(predicted.x, 2460);
  const enemy: Enemy = { id: 1, x: 2460, y: 1286, angle: 0, hitpoints: 100, archetype: 'skeleton' };
  scene.enemies = [enemy];
  tickPlayerShots(scene, [player], 1500, 0.5, context);
  assert.ok(enemy.hitpoints < 100);
  assert(player.damageMeter!.abilities['Scout bolt'].damage > 0);
  const state = new SessionState();
  projectState(state, { id: 'w', name: 'W', hostId: 'p', players: [player], training: scene });
  assert.equal(materializeState(state)!.training!.playerShots![0].abilityId, 'fixture:bolt');
});
test('registered enemies drive attributes, spawn policy, hitboxes and movement', () => {
  assert.deepEqual(enemyAttributes('fixture:giant', 'elite', 'Hard', context), {
    hitPoints: 900,
    damage: 144,
  });
  const enemy: Enemy = {
    id: 1,
    archetype: 'fixture:giant',
    x: 2400,
    y: 1280,
    hitpoints: 75,
    angle: 0,
  };
  assert.equal(enemyMaxHealth(enemy, 'Easy', context), 75);
  assert.equal(enemyHitbox(enemy, context).radius, 40);
  assert.equal(spawnArchetype(0.25, 0, context), 'fixture:giant');
  moveEnemies([enemy], [{ x: 2500, y: 1280, hitpoints: 100 }], 0.1, 0, context);
  assert.ok(enemy.x > 2400 && enemy.x <= 2402.01);
  const player = hero();
  player.scene = 'forest';
  player.autoAttack = false;
  const arena = createTrainingScene(0);
  arena.training = false;
  arena.nextSpawn = 1e9;
  arena.endsAt = 1e9;
  arena.enemies = [enemy];
  enemy.attack = {
    startedAt: 0,
    endsAt: 1000,
    x: player.x,
    y: player.y,
    radius: 50,
    ranged: false,
  };
  stepCombat(arena, [player], 1000, 0, context);
  assert.equal(
    player.hitpoints,
    88,
    'registered enemy damage reaches authoritative hit resolution',
  );
});

test('an added class uses shared training/forest dispatch and respects its ability duration', () => {
  for (const training of [true, false]) {
    const player = hero();
    player.x = TRAINING_ZONES[0].x;
    player.y = TRAINING_ZONES[0].y;
    player.autoTarget = false;
    player.aimX = player.x + 100;
    player.aimY = player.y;
    player.autoAttack = false;
    player.attackAt = 1000;

    if (!training) {
      player.scene = 'forest';
    }

    const arena = createTrainingScene(0);
    arena.training = training;
    arena.enemies = [];
    tickPlayerCombat(arena, [player], 1050, 0, context);
    assert.equal(arena.playerShots!.length, 3);
    arena.playerShots = [];
    player.attackAt = 2000;
    tickPlayerCombat(arena, [player], 2150, 0, context);
    assert.equal(arena.playerShots.length, 0, 'registered duration expired');
  }
});
