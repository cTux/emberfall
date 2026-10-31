import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOBBY_PORTAL } from '@emberfall/core';

import { sceneAction, tickScene, sceneState } from './scenes.ts';
import type { SceneWorld } from './scenes.ts';
import { hero } from './scenes.fixture.ts';

test('empty and dead scenes freeze combat deadlines, resume on entry, and can regenerate', async () => {
  const a = hero('a'),
    b = hero('b');
  const world: SceneWorld = {
    players: new Map([
      [a.id, a],
      [b.id, b],
    ]),
  };
  sceneAction(world, a, { type: 'createScene', scene: 'Forest', difficulty: 'Easy' }, 0);
  for (const player of [a, b]) sceneAction(world, player, { type: 'ready', ready: true }, 0);
  tickScene(world, 5000, 0);
  const scene = world.scene!;
  scene.nextSpawn = 6000;
  scene.enemies = [
    {
      id: 90,
      x: 2700,
      y: 1280,
      hitpoints: 100,
      angle: 0,
      cooldownUntil: 6000,
      attack: { startedAt: 5000, endsAt: 6000, x: 2700, y: 1280, radius: 40, ranged: true },
      debuffs: [{ kind: 'burn', stacks: 1, nextTick: 6000, expiresAt: 10000, ownerId: a.id }],
    },
  ];
  scene.spawns = [
    { id: 91, x: 2900, y: 1280, hitpoints: 10, angle: 0, warnedAt: 5000, spawnsAt: 6000 },
  ];
  scene.projectiles = [{ id: 92, x: 2600, y: 1280, vx: 210, vy: 0, expiresAt: 7500 }];
  scene.drops = [{ id: 93, kind: 'experience', x: 2600, y: 1280, at: 5000 }];
  scene.damage = [{ id: 94, x: 2700, y: 1280, target: 'enemy:90', amount: 1, at: 5000 }];
  scene.explosions = [{ id: 95, x: 2700, y: 1280, at: 5000 }];
  scene.playerShots = [
    {
      id: 96,
      ownerId: a.id,
      kind: 'arrow',
      x: 2400,
      y: 1280,
      angle: 0,
      remaining: 1000,
      hitIds: [],
    },
  ];
  a.hitpoints = 0;
  sceneAction(world, b, { type: 'leaveScene' }, 5000);
  tickScene(world, 5000, 0.05);
  assert.equal(sceneState(scene)?.pausedAt, 5000);
  const frozen = structuredClone(scene);
  tickScene(world, 65000, 1);
  assert.deepEqual(scene, frozen, 'a living village player and a corpse do not advance combat');
  b.x = LOBBY_PORTAL.x;
  b.y = LOBBY_PORTAL.y - 15;
  sceneAction(world, b, { type: 'joinScene' }, 65000);
  tickScene(world, 65000, 0);
  assert.equal(scene.pausedAt, undefined);
  assert.equal(scene.endsAt, 185000);
  assert.equal(scene.nextSpawn, 66000);
  assert.equal(scene.enemies[0].attack?.endsAt, 66000);
  assert.equal(scene.enemies[0].cooldownUntil, 66000);
  assert.equal(scene.enemies[0].debuffs?.[0].nextTick, 66000);
  assert.equal(scene.enemies[0].debuffs?.[0].expiresAt, 70000);
  assert.equal(scene.spawns[0].spawnsAt, 66000);
  assert.equal(scene.spawns[0].warnedAt, 65000);
  assert.equal(scene.projectiles[0].expiresAt, 67500);
  assert.equal(scene.drops[0].at, 65000);
  assert.equal(scene.damage[0].at, 65000);
  assert.equal(scene.explosions[0].at, 65000);
  assert.equal(b.attackAt, 65000, 'joining attacks use the current server clock');
  const c = hero('c');
  world.players.set(c.id, c);
  assert.throws(() =>
    sceneAction(world, c, { type: 'createScene', scene: 'Forest', difficulty: 'Easy' }, 65000),
  );
  sceneAction(world, b, { type: 'leaveScene' }, 65000);
  a.hitpoints = 0;
  sceneAction(world, c, { type: 'createScene', scene: 'Forest', difficulty: 'Easy' }, 66000);
  assert.notEqual(world.scene!.id, scene.id);
  assert.equal(world.scene!.phase, 'voting');
  assert.deepEqual(world.scene!.enemies, []);
  assert.deepEqual(world.scene!.ready, []);
  assert.equal(a.scene, undefined);
  assert.equal(a.hitpoints, a.maxHitpoints);
  for (const player of [a, b, c]) sceneAction(world, player, { type: 'ready', ready: true }, 66000);
  tickScene(world, 71000, 0);
  for (const player of [a, b, c]) sceneAction(world, player, { type: 'leaveScene' }, 71000);
  tickScene(world, 71000, 0);
  const empty = structuredClone(world.scene);
  tickScene(world, 200000, 1);
  assert.deepEqual(
    world.scene,
    empty,
    'an empty forest remains paused beyond its original deadline',
  );
  c.x = LOBBY_PORTAL.x;
  c.y = LOBBY_PORTAL.y - 15;
  sceneAction(world, c, { type: 'createScene', scene: 'Forest', difficulty: 'Easy' }, 200000);
  assert.notEqual(world.scene!.id, empty!.id);
});
