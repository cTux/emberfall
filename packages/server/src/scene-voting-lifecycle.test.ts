import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LOBBY_PORTAL,
  nearbyInteraction,
  clientMessage as validatedMessage,
} from '@emberfall/core';
import { clientMessage } from '@emberfall/common';
import { sceneAction, tickScene, reconcileVote } from './scenes.ts';
import type { SceneWorld } from './scenes.ts';
import { hero } from './scenes.fixture.ts';

test('server scene lifecycle: proximity, unanimous votes, retract, membership changes, combat, death and boss-gated return', (t) => {
  t.mock.method(Math, 'random', () => {
    return 0.5;
  });
  const a = hero('a'),
    b = hero('b');
  const world: SceneWorld = {
    players: new Map([
      [a.id, a],
      [b.id, b],
    ]),
  };
  a.x = 10;
  assert.throws(() => {
    return sceneAction(
      world,
      a,
      { type: 'createScene', scene: 'Forest', difficulty: 'Easy' },
      10000,
    );
  });
  a.x = LOBBY_PORTAL.x;
  sceneAction(world, a, { type: 'createScene', scene: 'Forest', difficulty: 'Easy' }, 10000);
  assert.equal(world.scene?.phase, 'voting');
  assert.equal(a.scene, undefined);
  assert.throws(() => {
    return sceneAction(
      world,
      a,
      { type: 'createScene', scene: 'Forest', difficulty: 'Easy' },
      10000,
    );
  });
  sceneAction(world, a, { type: 'ready', ready: true }, 10000);
  assert.equal(world.scene?.countdownAt, null);
  sceneAction(world, b, { type: 'ready', ready: true }, 10000);
  assert.equal(world.scene?.countdownAt, 15000);
  tickScene(world, 14999, 0.05);
  assert.equal(a.scene, undefined);
  sceneAction(world, a, { type: 'ready', ready: false }, 14999);
  tickScene(world, 16000, 0.05);
  assert.equal(world.scene?.phase, 'voting');
  sceneAction(world, a, { type: 'ready', ready: true }, 17000);
  assert.equal(world.scene?.countdownAt, 22000);
  const c = hero('c');
  world.players.set('c', c);
  reconcileVote(world, 18000);
  assert.equal(world.scene?.countdownAt, null);
  world.players.delete('c');
  reconcileVote(world, 19000);
  assert.equal(world.scene?.countdownAt, 24000);
  tickScene(world, 24000, 0.05);
  assert.equal(a.scene, 'forest');
  assert.equal(b.scene, 'forest');
  assert.equal(world.scene?.endsAt, 144000);
  const scene = world.scene;
  scene.nextSpawn = Infinity;
  scene.spawns = [];
  scene.enemies = [{ id: 999, x: a.x + 45, y: a.y, hitpoints: 10, angle: 0 }];
  a.attackAt = 23700;
  b.attackAt = 30000;
  tickScene(world, 24700, 0);
  assert.equal(scene.enemies[0].hitpoints, 5);
  tickScene(world, 25700, 0);
  assert.equal(scene.enemies.length, 0);
  assert.equal(a.experience, 1);
  assert.throws(() => {
    return sceneAction(world, a, { type: 'returnLobby' }, 26000);
  });
  a.hitpoints = 3;
  a.attackAt = 30000;
  scene.enemies = [{ id: 1000, x: a.x, y: a.y, hitpoints: 10, angle: 0 }];
  tickScene(world, 27000, 0);
  assert.equal(a.hitpoints, 3);
  tickScene(world, 27650, 0);
  assert.equal(a.hitpoints, 0);
  assert.equal(b.scene, 'forest');
  sceneAction(world, a, { type: 'returnLobby' }, 28000);
  assert.equal(a.scene, undefined);
  assert.equal(a.hitpoints, 100);
  assert.equal(scene.phase, 'active');
  tickScene(world, 143999, 0);
  assert.equal(scene.phase, 'active');
  tickScene(world, 144000, 0);
  assert.equal(scene.phase, 'active');
  assert.equal(scene.portals.length, 0);
  assert(
    scene.spawns?.some((e) => {
      return e.kind === 'boss';
    }),
  );
  tickScene(world, 145000, 0);
  const boss = scene.enemies.find((e) => {
    return e.kind === 'boss';
  })!;
  assert.equal(boss.hitpoints, 300);
  assert.equal(scene.bossId, boss.id);
  assert.throws(() => {
    return sceneAction(world, b, { type: 'returnLobby' }, 144001);
  });
  b.x = boss.x - 70;
  b.y = boss.y;

  for (let hit = 1; hit <= 59; hit++) {
    tickScene(world, 145000 + hit * 1000, 0);
  }

  assert.equal(scene.phase, 'active');
  assert.equal(boss.hitpoints, 5);
  assert.equal(
    scene.enemies.filter((e) => {
      return e.kind === 'boss';
    }).length,
    1,
  );
  tickScene(world, 205000, 0);
  assert.equal(scene.phase, 'ended');
  assert.equal(scene.enemies.length, 0);
  const returnPosition = { x: b.x, y: b.y };
  b.x = 10;
  b.y = 10;
  assert.throws(() => {
    return sceneAction(world, b, { type: 'returnLobby' }, 144001);
  });
  Object.assign(b, returnPosition);
  assert.equal(nearbyInteraction(b, true, scene.portals)?.id, 'return');
  sceneAction(world, b, { type: 'returnLobby' }, 144002);
  assert.equal(world.scene, undefined);
});

test('scene command schemas reject unsupported difficulty values', () => {
  for (const difficulty of ['Impossible', 'medium', '', 2, null, undefined]) {
    const command = { type: 'createScene', scene: 'Forest', difficulty };
    assert.equal(clientMessage.safeParse(command).success, false);
    assert.equal(validatedMessage.safeParse(command).success, false);
  }
});
