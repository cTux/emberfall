import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LocalMovement } from '../../client/src/local-movement.ts';

import { FOREST, fireClassAttack } from '@emberfall/core';

import { fixture, frame } from '../../../tests/local-projectiles.fixture.ts';

test('confirmation preserves launch trajectory, suppresses duplicates and retires completed casts', async () => {
  const source = fixture(),
    movement = new LocalMovement('p', () => {});
  frame(movement, source, 0);
  movement.input(1, 0, 0);
  const cast = frame(movement, source, 100);
  const confirmed = structuredClone(source);
  confirmed.serverNow = 10100;
  confirmed.players[0].attackAt = 10100;
  fireClassAttack(confirmed.scene!, confirmed.players[0]);
  confirmed.scene!.playerShots!.push({
    ...confirmed.scene!.playerShots![0],
    ownerId: 'remote',
    id: 90,
  });
  const result = frame(movement, confirmed, 150);
  const local = result.scene.playerShots!.filter((s) => s.ownerId === 'p');
  assert.equal(local.length, 2);
  assert(
    local.every((s) => s.x > cast.player.x),
    'confirmation cannot snap shots back to the server origin',
  );
  assert.equal(result.scene.playerShots!.filter((s) => s.ownerId === 'remote').length, 1);
  confirmed.scene!.playerShots = [];
  const completed = structuredClone(confirmed);
  completed.serverNow = 10150;
  assert.equal(frame(movement, completed, 200).scene.playerShots!.length, 0);
});

test('server target corrections and rejected casts do not replay an old launch', async () => {
  const source = fixture(),
    movement = new LocalMovement('p', () => {});
  frame(movement, source, 0);
  frame(movement, source, 100);
  const reply = structuredClone(source);
  reply.serverNow = 10100;
  reply.players[0].attackAt = 10100;
  reply.scene!.enemies = [{ ...reply.scene!.enemies[0], id: 3 }];
  fireClassAttack(reply.scene!, reply.players[0]);
  const corrected = frame(movement, reply, 150).scene.playerShots!;
  assert.equal(corrected.length, 2);
  assert.equal(corrected[0].targetId, 3);
  const rejected = structuredClone(reply);
  rejected.scene!.playerShots = [];
  rejected.serverNow = 10150;
  assert.equal(frame(movement, rejected, 200).scene.playerShots!.length, 0);
});

test('a late server cast retains its in-flight position and remaining range without relaunching', async () => {
  const source = fixture(),
    movement = new LocalMovement('p', () => {});
  source.scene!.enemies = [];
  frame(movement, source, 0);
  movement.input(1, 0, 0);
  assert.equal(frame(movement, source, 100).scene.playerShots!.length, 0);
  const reply = fixture();
  reply.serverNow = 10100;
  reply.players[0].attackAt = 10100;
  fireClassAttack(reply.scene!, reply.players[0]);
  for (const shot of reply.scene!.playerShots!) {
    shot.x += 80;
    shot.remaining -= 80;
  }

  const result = frame(movement, reply, 150);
  assert.equal(result.scene.playerShots!.length, 2);
  assert.deepEqual(
    result.scene.playerShots!.map((s) => [s.x, s.y, s.remaining]),
    reply.scene!.playerShots!.map((s) => [
      s.x + result.player.x - reply.players[0].x,
      s.y,
      s.remaining,
    ]),
  );
  assert.equal(frame(movement, reply, 200).scene.playerShots!.length, 2);
  for (let now = 250; now <= 650; now += 50) frame(movement, reply, now);
  assert.equal(frame(movement, reply, 650).scene.playerShots!.length, 0);
});

test('newly confirmed moving casts attach once to the displayed pose in both areas and across seams', () => {
  for (const training of [false, true])
    for (const delay of [50, 200, 700]) {
      const source = fixture('mage', training);
      source.players[0].x = FOREST.width - 5;
      source.players[0].attackAt = undefined;
      const movement = new LocalMovement('p', () => {});
      frame(movement, source, 0);
      movement.input(1, 0, 0);
      for (let t = 50; t < delay; t += 50) frame(movement, source, t);
      const reply = structuredClone(source);
      reply.serverNow! += delay;
      reply.players[0].attackAt = reply.serverNow;
      reply.players[0].autoTarget = false;
      reply.players[0].aimX = 200;
      reply.players[0].aimY = reply.players[0].y;
      fireClassAttack((training ? reply.training : reply.scene)!, reply.players[0]);
      const result = frame(movement, reply, delay);
      assert.equal(result.scene.playerShots!.length, 2);
      for (const shot of result.scene.playerShots!) {
        assert(Math.abs(shot.x - result.player.x) < 1e-8);
        assert.equal(shot.y, result.player.y);
      }

      const next = frame(movement, reply, delay + 10);
      assert.equal(next.scene.playerShots!.length, 2);
      assert(next.scene.playerShots![0].remaining < result.scene.playerShots![0].remaining);
      assert.equal((training ? reply.training : reply.scene)!.playerShots![0].x, FOREST.width - 5);
    }
});

test('confirmation cannot bend a moving cast or rebind its surviving projectile to a sibling', () => {
  for (const training of [false, true]) {
    const source = fixture('ranger', training);
    const movement = new LocalMovement('p', () => {});
    frame(movement, source, 0);
    movement.input(0, 1, 0);
    const cast = frame(movement, source, 100);
    const angles = cast.scene.playerShots!.map((s) => s.angle);
    const reply = structuredClone(source);
    reply.serverNow = 10100;
    reply.players[0].attackAt = 10100;
    const scene = (training ? reply.training : reply.scene)!;
    fireClassAttack(scene, reply.players[0]);
    assert.notEqual(scene.playerShots![0].angle, angles[0]);
    assert.deepEqual(
      frame(movement, reply, 150).scene.playerShots!.map((s) => s.angle),
      angles,
    );
    const next = structuredClone(reply);
    next.serverNow = 10150;
    const nextScene = (training ? next.training : next.scene)!;
    nextScene.playerShots!.shift();
    const remaining = frame(movement, next, 200).scene.playerShots!;
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].id, nextScene.playerShots![0].id);
    assert.equal(remaining[0].angle, angles[1]);
    assert.equal(frame(movement, next, 220).scene.playerShots![0].angle, angles[1]);
  }
});
