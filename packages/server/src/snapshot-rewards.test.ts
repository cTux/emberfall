import { stepCombat, FOREST } from '@emberfall/core';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import type { SceneState } from '@emberfall/common';
import { hero } from './snapshots.fixture.ts';

// These geometry assertions cover ordinary hits; critical outcomes have dedicated tests.
beforeEach((t) => {
  if ('mock' in t) t.mock.method(Math, 'random', () => 0.5);
});

test('boss defeat puts fixed return portals within reach of all scattered players', async () => {
  const players = [
    { ...hero, scene: 'forest' as const, x: 12, y: 1200 },
    { ...hero, id: 'q', scene: 'forest' as const, x: 4300, y: 200 },
  ];
  const scene: SceneState = {
    id: 'run',
    playerCount: players.length,
    type: 'Forest' as const,
    difficulty: 'Easy' as const,
    phase: 'active' as const,
    ready: [],
    countdownAt: null,
    bossId: 99,
    endsAt: 10000,
    nextSpawn: 20000,
    sequence: 0,
    damage: [],
    enemies: [{ id: 99, kind: 'boss', x: 50, y: 1200, hitpoints: 5, angle: 0 }],
    portals: [],
  };
  stepCombat(scene, players, 10000, 0.05);
  assert.deepEqual(scene.portals, [
    { x: 12, y: 1215 },
    { x: 4300, y: 215 },
  ]);
  players[0].x = 500;
  assert.equal(scene.portals[0].x, 12, 'portal must stay in the scene, not follow a player');
});

test('kills drop experience and 10-percent coins; experience pickups reward players and expire', (t) => {
  let roll = 0.099;
  t.mock.method(Math, 'random', () => roll);
  const player = { ...hero, scene: 'forest' as const, x: 2400, y: 1280 };
  const scene: SceneState = {
    id: 'loot',
    type: 'Forest',
    difficulty: 'Easy',
    phase: 'active',
    ready: [],
    countdownAt: null,
    endsAt: 120000,
    nextSpawn: 1e9,
    sequence: 100,
    damage: [],
    portals: [],
    enemies: [{ id: 1, x: 2440, y: 1280, hitpoints: 5, angle: 0 }],
  };
  stepCombat(scene, [player], 10000, 0);
  assert.deepEqual(
    scene.drops!.map((d) => d.kind),
    ['experience', 'gold'],
  );
  const experience = player.experience;
  player.x = 2440;
  stepCombat(scene, [player], 10200, 0);
  assert.equal(scene.drops!.length, 2, 'initial hop is visible before pickup');
  stepCombat(scene, [player], 10300, 0);
  assert.equal(scene.drops!.length, 0);
  assert.equal(player.experience, experience + 1, 'collection grants one extra experience');
  assert.equal(player.coins, 1, 'gold grants one saved coin to its collector');
  roll = 0.1;
  scene.enemies = [{ id: 2, x: 2480, y: 1280, hitpoints: 5, angle: 0 }];
  stepCombat(scene, [player], 11000, 0);
  assert.deepEqual(
    scene.drops!.map((d) => d.kind),
    ['experience'],
  );
  scene.phase = 'ended';
  stepCombat(scene, [player], 71000, 0);
  assert.equal(scene.drops!.length, 0);
});

test('loot attracts across the seam and rewards every living scene player exactly once', async () => {
  const scene: SceneState = {
    id: 'magnet',
    type: 'Forest',
    difficulty: 'Easy',
    phase: 'ended',
    ready: [],
    countdownAt: null,
    endsAt: 0,
    sequence: 0,
    nextSpawn: 0,
    enemies: [],
    damage: [],
    portals: [],
    drops: [
      { id: 1, kind: 'experience', x: FOREST.width - 80, y: 500, at: 0 },
      { id: 2, kind: 'gold', x: FOREST.width - 80, y: 500, at: 0 },
    ],
  };
  const player = { ...hero, scene: 'forest' as const, x: 10, y: 500 };
  const dead = { ...player, id: 'dead', x: FOREST.width - 70, hitpoints: 0 };
  const lobby = { ...hero, id: 'lobby', x: FOREST.width - 70, y: 500 };
  const teammate = { ...player, id: 'teammate', x: 2000, y: 1000, experience: 7 };
  const nearby = { ...player, id: 'nearby', x: 11 };
  const players = [dead, lobby, player, teammate, nearby];
  stepCombat(scene, players, 400, 0.05);
  assert.equal(scene.drops![0].x, FOREST.width - 66);
  assert.equal(scene.drops![0].collectorId, player.id);
  assert.equal(scene.drops![1].x, FOREST.width - 66);
  for (let i = 0; i < 10; i++) stepCombat(scene, players, 450 + i * 50, 0.05);
  assert.equal(scene.drops!.length, 0);
  assert.deepEqual(
    players.map((p) => p.coins ?? 0),
    [0, 0, 1, 0, 0],
  );
  assert.deepEqual(
    players.map((p) => p.experience),
    [0, 0, 1, 8, 1],
  );
  scene.drops = [{ id: 4, kind: 'experience', x: player.x, y: player.y, at: 700 }];
  stepCombat(scene, players, 999, 0);
  assert.deepEqual(
    players.map((p) => p.experience),
    [0, 0, 1, 8, 1],
    'hop grants no XP',
  );
  stepCombat(scene, players, 1000, 0);
  stepCombat(scene, players, 1050, 0);
  assert.equal(player.coins, 1, 'removed coins cannot reward twice');
  assert.equal(scene.drops.length, 0);
  assert.deepEqual(
    players.map((p) => p.experience),
    [0, 0, 2, 9, 2],
  );
  scene.drops = [{ id: 5, kind: 'experience', x: player.x, y: player.y, at: 0 }];
  stepCombat(scene, players, 60000, 0);
  assert.equal(scene.drops.length, 0);
  assert.deepEqual(
    players.map((p) => p.experience),
    [0, 0, 2, 9, 2],
    'expiry grants no XP',
  );
  scene.drops = [{ id: 6, kind: 'gold', x: 500, y: 500, at: 60000 }];
  stepCombat(scene, players, 60050, 0.05);
  assert.equal(scene.drops[0].x, 500, 'distant drops stay put');
});
