import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOBBY_PORTAL, CLASS_IDS, FOREST_PORTAL } from '@emberfall/core';

import { sceneAction, tickScene } from './scenes.ts';
import type { SceneWorld } from './scenes.ts';
import { hero } from './scenes.fixture.ts';

test('system chat announces scene transitions and deaths exactly once', async () => {
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
  assert.deepEqual(
    world.chat?.map((m) => m.text),
    [
      'a joined the scene. Everyone became stronger.',
      'b joined the scene. Everyone became stronger.',
    ],
  );
  const scene = world.scene!;
  scene.nextSpawn = Infinity;
  scene.enemies = [];
  scene.spawns = [];
  a.hitpoints = 1;
  scene.projectiles = [{ id: 99, x: a.x, y: a.y, vx: 0, vy: 0, expiresAt: 9000 }];
  tickScene(world, 6000, 0.05);
  assert.equal(a.hitpoints, 0);
  assert.equal(world.chat?.at(-1)?.text, 'a died.');
  tickScene(world, 6050, 0.05);
  assert.equal(world.chat?.filter((m) => m.text === 'a died.').length, 1);
  sceneAction(world, a, { type: 'returnLobby' }, 6100);
  assert.equal(world.chat?.at(-1)?.text, 'a left the scene. Everyone became weaker.');
  a.x = LOBBY_PORTAL.x;
  a.y = LOBBY_PORTAL.y - 15;
  sceneAction(world, a, { type: 'joinScene' }, 6200);
  assert.equal(world.chat?.at(-1)?.text, 'a joined the scene. Everyone became stronger.');
  sceneAction(world, a, { type: 'leaveScene' }, 6300);
  assert.equal(world.chat?.at(-1)?.text, 'a left the scene. Everyone became weaker.');
  assert.throws(() => sceneAction(world, a, { type: 'leaveScene' }, 6400));
  assert.equal(world.chat?.length, 6);
  b.hitpoints = 0;
  a.x = LOBBY_PORTAL.x;
  a.y = LOBBY_PORTAL.y - 15;
  sceneAction(world, a, { type: 'createScene', scene: 'Forest', difficulty: 'Easy' }, 6500);
  assert.equal(world.chat?.at(-1)?.text, 'b left the scene. Everyone became weaker.');
  assert(world.chat?.every((m) => m.name === 'System' && m.playerId === ''));
  assert(world.chat?.every((m) => m.excludedPlayerId === m.text[0]));
});

test('players can join and rejoin an unfinished scene, but not after return portals open', async () => {
  const a = hero('a');
  const world: SceneWorld = { players: new Map([[a.id, a]]) };
  assert.throws(() => sceneAction(world, a, { type: 'joinScene' }, 0));
  sceneAction(world, a, { type: 'createScene', scene: 'Forest', difficulty: 'Easy' }, 0);
  assert.throws(() => sceneAction(world, a, { type: 'joinScene' }, 0));
  sceneAction(world, a, { type: 'ready', ready: true }, 0);
  assert.throws(() => sceneAction(world, a, { type: 'joinScene' }, 1000));
  tickScene(world, 5000, 0);
  const scene = world.scene!;
  const b = hero('late');
  world.players.set(b.id, b);
  b.x = 10;
  assert.throws(() => sceneAction(world, b, { type: 'joinScene' }, 6000));
  b.x = LOBBY_PORTAL.x;
  sceneAction(world, b, { type: 'joinScene' }, 6000);
  assert.equal(b.scene, 'forest');
  assert.equal(b.x, FOREST_PORTAL.x);
  assert.equal(b.y, FOREST_PORTAL.y);
  assert.equal(world.scene, scene);
  assert.equal(scene.endsAt, 125000);
  assert.throws(() => sceneAction(world, b, { type: 'joinScene' }, 6001));
  sceneAction(world, a, { type: 'leaveScene' }, 7000);
  sceneAction(world, b, { type: 'leaveScene' }, 7000);
  assert.equal(world.scene, scene, 'unfinished scenes stay joinable when the village is occupied');
  a.x = LOBBY_PORTAL.x;
  a.y = LOBBY_PORTAL.y;
  sceneAction(world, a, { type: 'joinScene' }, 8000);
  scene.phase = 'ended';
  scene.portals = [{ x: a.x, y: a.y }];
  b.x = LOBBY_PORTAL.x;
  b.y = LOBBY_PORTAL.y;
  assert.throws(() => sceneAction(world, b, { type: 'joinScene' }, 9000));
  sceneAction(world, a, { type: 'returnLobby' }, 9000);
  assert.equal(world.scene, undefined);
  sceneAction(world, b, { type: 'createScene', scene: 'Forest', difficulty: 'Easy' }, 10000);
  // The assertion above narrows scene to undefined; sceneAction mutates it again.
  // oxlint-disable-next-line typescript/no-unnecessary-type-assertion
  assert.notEqual((world as SceneWorld).scene?.id, scene.id);
});

test('every scene exit restores all classes and injured or dead companions to their maximum stats', async () => {
  for (const exit of ['portal', 'death', 'leave'] as const) {
    for (const bearHealth of [0, 7]) {
      const players = CLASS_IDS.map((classId) => ({ ...hero(classId), classId }));
      const world: SceneWorld = { players: new Map(players.map((p) => [p.id, p])) };
      sceneAction(
        world,
        players[0],
        { type: 'createScene', scene: 'Forest', difficulty: 'Easy' },
        10000,
      );
      for (const player of players)
        sceneAction(world, player, { type: 'ready', ready: true }, 10000);
      tickScene(world, 15000, 0);
      const scene = world.scene!;
      if (exit === 'portal') {
        scene.phase = 'ended';
        scene.portals = players.map((p) => ({ x: p.x, y: p.y }));
      }
      for (const player of players) {
        player.maxHitpoints = 120;
        player.hitpoints = exit === 'death' ? 0 : 12;
        if (player.bear) {
          player.bear.maxHitpoints = 180;
          player.bear.hitpoints = bearHealth;
          player.bear.resurrectAt = bearHealth === 0 ? 20000 : undefined;
        }
      }
      for (const player of players) {
        sceneAction(
          world,
          player,
          { type: exit === 'leave' ? 'leaveScene' : 'returnLobby' },
          15001,
        );
        assert.equal(player.scene, undefined);
        assert.equal(player.hitpoints, 120);
        if (player.bear) {
          assert.equal(player.bear.hitpoints, 180);
          assert.equal(player.bear.resurrectAt, undefined);
          assert.equal(player.bear.x, player.x);
          assert.equal(player.bear.y, player.y);
        }
      }
      assert.equal(world.scene, exit === 'portal' ? undefined : scene);
      tickScene(world, 15002, 0);
      assert.equal(players.at(-1)!.bear!.hitpoints, 180);
    }
  }
});
