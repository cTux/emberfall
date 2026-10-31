import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FOREST, ARENA, forestTrees, moveForestActor, forestDistance } from '@emberfall/core';

import { sceneAction, tickScene } from './scenes.ts';
import type { SceneWorld } from './scenes.ts';
import { hero } from './scenes.fixture.ts';

test('forest and expanded lobby share dimensions; all edges wrap; indexed trunks stop players and enemies including seam copies', async () => {
  assert.equal(FOREST.width, ARENA.width);
  assert.equal(FOREST.height, ARENA.height);

  // Known clear crossing lines isolate wrapping from obstacle collisions.
  for (const [x, y, dx, dy] of [
    [2, 1280, -8, 0],
    [4798, 1280, 8, 0],
    [2400, 2, 0, -8],
    [2400, 2558, 0, 8],
  ]) {
    const moved = moveForestActor({ x, y }, dx, dy, 12);
    assert(forestDistance(moved, { x: x + dx, y: y + dy }) < 0.001);
    assert(moved.x >= 0 && moved.x < FOREST.width && moved.y >= 0 && moved.y < FOREST.height);
  }

  const tree = forestTrees(400, 400, 100)[0];

  for (const radius of [10, 12]) {
    const moved = moveForestActor({ x: tree.x - 60, y: tree.y }, 120, 0, radius);
    assert(moved.x <= tree.x - tree.radius - radius);
    assert(moved.x > tree.x - 60);
  }

  const left = forestTrees(0, 200, 200),
    right = forestTrees(FOREST.width, 200, 200);
  assert.deepEqual(
    left.map((t) => {
      return t.id;
    }),
    right.map((t) => {
      return t.id;
    }),
  );
});

test('combat uses wrapped distances and warned melee damage respects its cooldown', async (t) => {
  // This geometry/cooldown scenario asserts base damage; critical boundaries have separate coverage.
  t.mock.method(Math, 'random', () => {
    return 0.5;
  });
  const a = hero('a');
  const world: SceneWorld = { players: new Map([[a.id, a]]) };
  sceneAction(world, a, { type: 'createScene', scene: 'Forest', difficulty: 'Easy' }, 10000);
  sceneAction(world, a, { type: 'ready', ready: true }, 10000);
  tickScene(world, 15000, 0);
  const scene = world.scene!;
  scene.nextSpawn = Infinity;
  scene.spawns = [];
  a.x = 2;
  a.y = 1280;
  a.attackAt = 14700;
  a.attackAngle = Math.PI; // Face across the seam; this test isolates wrapped hit detection.
  scene.enemies = [{ id: 999, x: FOREST.width - 20, y: 1280, hitpoints: 10, angle: 0 }];
  tickScene(world, 15700, 0);
  assert.equal(scene.enemies[0].hitpoints, 5);
  assert.equal(a.hitpoints, 100);
  a.attackAt = 20000;
  tickScene(world, 16350, 0);
  assert.equal(a.hitpoints, 97);
  tickScene(world, 16400, 0);
  assert.equal(a.hitpoints, 97);
  a.attackAt = 20000;
  tickScene(world, 17350, 0);
  assert.equal(a.hitpoints, 97);
  tickScene(world, 18000, 0);
  assert.equal(a.hitpoints, 94);
  sceneAction(world, a, { type: 'leaveScene' }, 16800);
  assert.equal(a.scene, undefined);
  assert.equal(world.scene, scene);
});
