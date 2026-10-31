import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { experienceRequired, hitEnemy } from '@emberfall/core';
import type { Player } from '@emberfall/common';
import { CharacterStore, decodeProgress, freshProgress } from './characters.ts';
import { tickScene, type SceneWorld } from './scenes.ts';

const hero = (id: string): Player => {
  return {
    ...freshProgress(),
    id,
    name: id,
    x: 2400,
    y: 1280,
    color: 0,
    scene: 'forest',
    attackAt: 1e9,
  };
};

const forest = (players: Player[]): SceneWorld => {
  return {
    players: new Map(
      players.map((player) => {
        return [player.id, player];
      }),
    ),
    scene: {
      id: 'forest',
      type: 'Forest',
      difficulty: 'Easy',
      phase: 'active',
      ready: [],
      electorate: '',
      countdownAt: null,
      endsAt: 1e9,
      nextSpawn: 1e9,
      sequence: 0,
      enemies: [],
      damage: [],
      portals: [],
    },
  };
};

test('shared XP pickups level every eligible player once and retain fractional XP', () => {
  const players = [hero('a'), hero('b')];

  for (const player of players) {
    player.experience = 49;
  }

  const world = forest(players);
  world.scene!.drops = [{ id: 1, kind: 'experience', amount: 1.5, x: 2400, y: 1280, at: 0 }];
  tickScene(world, 1000, 0);
  tickScene(world, 1050, 0);
  assert.equal(world.scene!.drops.length, 0);

  for (const player of players) {
    assert.equal(player.level, 2);
    assert.equal(player.experience, 0.5);
    assert.equal(player.paragon, 0);
  }
});

test('kill credit levels its owner before the dropped XP is collected', () => {
  const player = hero('a');
  player.experience = 49;
  const world = forest([player]);
  const enemy = { id: 1, x: 2400, y: 1280, hitpoints: 1, angle: 0 };
  world.scene!.enemies = [enemy];
  hitEnemy(world.scene!, enemy, 1, player, 1000);
  tickScene(world, 1000, 0);
  assert.equal(player.level, 2);
  assert.equal(player.experience, 0);
});

test('awarded paragon and XP survive class changes and a database restart', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'emberfall-progression-'));
  const path = join(directory, 'save.sqlite');
  let store = new CharacterStore(path);
  await store.ready;
  try {
    const saved = store.create('Hero');
    const player = {
      ...hero('a'),
      ...saved.progress,
      classId: saved.classId,
      classes: saved.classes,
    };
    player.level = 20;
    player.paragon = 2;
    player.experience = experienceRequired(20, 2) - 1;
    const world = forest([player]);
    world.scene!.drops = [{ id: 1, kind: 'experience', amount: 2, x: 2400, y: 1280, at: 0 }];
    tickScene(world, 1000, 0);
    assert.equal(player.level, 20);
    assert.equal(player.paragon, 3);
    assert.equal(player.experience, 1);
    store.selectClass(saved.id, player, 'mage');
    assert.equal(player.paragon, 0);
    store.close();
    store = new CharacterStore(path);
    await store.ready;
    const restored = store.load(saved.token);
    assert.equal(restored.classes.warrior.level, 20);
    assert.equal(restored.classes.warrior.paragon, 3);
    assert.equal(restored.classes.warrior.experience, 1);
    assert.equal(restored.progress.paragon, 0);
    store.selectClass(saved.id, player, 'warrior');
    assert.equal(player.paragon, 3);
  } finally {
    store.close();
    rmSync(directory, { recursive: true });
  }
});

test('old saves default paragon to zero and retain levels above 20 as paragon', () => {
  const { paragon: _, ...legacy } = freshProgress();
  assert.equal(decodeProgress(JSON.stringify(legacy)).progress.paragon, 0);
  const migrated = decodeProgress(JSON.stringify({ ...legacy, level: 22, experience: 7 })).progress;
  assert.equal(migrated.level, 20);
  assert.equal(migrated.paragon, 2);
  assert.equal(migrated.experience, 7);
  assert.throws(() => {
    return decodeProgress(JSON.stringify({ ...legacy, paragon: -1 }));
  });
});
