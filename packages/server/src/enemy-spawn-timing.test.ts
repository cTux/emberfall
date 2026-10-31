import { test } from 'node:test';
import assert from 'node:assert/strict';

import { stepCombat, moveEnemies } from '@emberfall/core';
import type { SceneState } from '@emberfall/common';

import { player, enemy } from './enemies.fixture.ts';

test('spawn warnings last a full second and small enemies move faster than brutes', async () => {
  const p = player(2400, 1280);
  const scene: SceneState = {
    id: 's',
    type: 'Forest',
    difficulty: 'Easy',
    phase: 'active',
    ready: [],
    countdownAt: null,
    endsAt: 1e9,
    nextSpawn: 0,
    sequence: 0,
    damage: [],
    portals: [],
    enemies: [],
  };
  stepCombat(scene, [p], 10000, 0);
  scene.nextSpawn = 1e9;
  assert.equal(scene.enemies.length, 0);
  assert.equal(scene.spawns!.length, 1);
  stepCombat(scene, [p], 10999, 0);
  assert.equal(scene.enemies.length, 0);
  stepCombat(scene, [p], 11000, 0);
  assert.equal(scene.enemies.length, 1);
  assert.equal(scene.spawns!.length, 0);
  const runner = { ...enemy(1, 2300, 1280), archetype: 'runner' as const };
  const brute = { ...enemy(2, 2300, 1280), archetype: 'brute' as const };
  moveEnemies([runner], [p], 0.05);
  moveEnemies([brute], [p], 0.05);
  assert(runner.x - 2300 > (brute.x - 2300) * 2);
});

test('successful elite rolls use configured HP; timer spawns only one configured boss', async (t) => {
  t.mock.method(Math, 'random', () => {
    return 0.04;
  });
  const scene: SceneState = {
    id: 's',
    type: 'Forest',
    difficulty: 'Easy',
    phase: 'active',
    ready: [],
    countdownAt: null,
    endsAt: 120000,
    nextSpawn: 0,
    sequence: 0,
    enemies: [],
    damage: [],
    portals: [],
  };
  const p = player(2400, 1280);

  for (let now = 1000; (scene.spawnCount ?? 0) < 20 && now < 50000; now += 400) {
    stepCombat(scene, [p], now, 0);
  }

  assert.equal(scene.spawnCount, 20);
  const elites = [...scene.enemies, ...scene.spawns!].filter((e) => {
    return e.kind === 'elite';
  });
  assert.equal(elites.length, 20);
  assert(
    elites.every((e) => {
      return e.hitpoints === 90;
    }),
  );
  stepCombat(scene, [p], 120000, 0);
  assert.equal(
    scene.enemies.some((e) => {
      return e.kind === 'boss';
    }),
    false,
  );
  assert.equal(
    scene.spawns!.find((e) => {
      return e.kind === 'boss';
    })?.hitpoints,
    300,
  );
  stepCombat(scene, [p], 121000, 0);
  const count = scene.enemies.length;
  assert.equal(
    scene.enemies.find((e) => {
      return e.kind === 'boss';
    })?.hitpoints,
    300,
  );
  stepCombat(scene, [p], 122000, 0);
  assert(scene.enemies.length > count, 'regular enemies keep spawning while the boss is alive');
  assert.equal(
    [...scene.enemies, ...scene.spawns!].filter((e) => {
      return e.kind === 'boss';
    }).length,
    1,
  );
  assert.equal(scene.phase, 'active');
  assert.equal(scene.portals.length, 0);
});
