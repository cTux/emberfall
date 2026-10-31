import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LocalMovement } from '../../client/src/local-movement.ts';

import { FOREST, fireClassAttack } from '@emberfall/core';

import { fixture, frame } from '../../../tests/local-projectiles.fixture.ts';

test('prediction wraps, expires and clears on death, class/area changes and stale replies', async () => {
  const source = fixture('ranger');
  source.players[0].x = FOREST.width - 5;
  source.scene!.enemies = [{ ...source.scene!.enemies[0], x: 80 }];
  const movement = new LocalMovement('p', () => {});
  frame(movement, source, 0);
  assert.equal(frame(movement, source, 100).scene.playerShots!.length, 2);
  assert(frame(movement, source, 150).scene.playerShots![0].x < 80);
  assert.equal(frame(movement, source, 1100).scene.playerShots!.length, 0);
  for (const change of ['death', 'class', 'area', 'paused'] as const) {
    const current = fixture(),
      m = new LocalMovement('p', () => {});
    frame(m, current, 0);
    assert.equal(frame(m, current, 100).scene.playerShots!.length, 2);
    const next = structuredClone(current);
    next.serverNow = 10050;
    if (change === 'death') next.players[0].hitpoints = 0;
    if (change === 'class') next.players[0].classId = 'warrior';
    if (change === 'area') next.scene!.id = 'another';
    if (change === 'paused') next.scene!.pausedAt = 10050;
    assert.equal(frame(m, next, 150).scene.playerShots!.length, 0);
  }
});

test('buffered enemy positions cannot hide a projectile before a confirmed impact', () => {
  const source = fixture('mage');
  const movement = new LocalMovement('p', () => {});
  frame(movement, source, 0);
  frame(movement, source, 100);
  const reply = structuredClone(source);
  reply.serverNow = 10100;
  reply.players[0].attackAt = 10100;
  fireClassAttack(reply.scene!, reply.players[0]);
  const player = movement.render(reply, 150)!;
  const buffered = structuredClone(reply);
  buffered.scene!.enemies[0].x = player.x + 10;
  buffered.scene!.enemies[0].y = player.y;
  movement.animateProjectiles(player, buffered, 150, false);
  assert.equal(
    buffered.scene!.playerShots!.length,
    2,
    'do not predict impact against older enemies',
  );
  assert.equal(buffered.scene!.damage.length, 0);
  const completed = structuredClone(reply);
  completed.serverNow = 10150;
  completed.scene!.playerShots = [];
  assert.equal(frame(movement, completed, 200).scene.playerShots!.length, 0);
});

test('a local root projectile remains visible through all confirmed bounces despite delayed snapshots', () => {
  for (const training of [false, true]) {
    const source = fixture('druid', training);
    const scene = (training ? source.training : source.scene)!;
    source.players[0].attackAt = 10000;
    source.players[0].autoAttack = false;
    fireClassAttack(scene, source.players[0], 10000);
    const id = scene.playerShots![0].id;
    const movement = new LocalMovement('p', () => {});
    assert.equal(frame(movement, source, 0).scene.playerShots!.length, 1);
    for (let bounce = 1; bounce <= 3; bounce++) {
      const reply = structuredClone(source);
      reply.serverNow! += bounce * 100;
      const confirmed = (training ? reply.training : reply.scene)!;
      const shot = confirmed.playerShots![0];
      shot.x += bounce * 20;
      shot.hitIds = Array.from({ length: bounce }, (_, i) => i + 10);
      shot.targetId = confirmed.enemies[1].id;
      movement.render(reply, bounce * 100);
      for (let elapsed = 0; elapsed <= 60; elapsed += 20) {
        // The buffered world can still have no projectile at the transition.
        const buffered = structuredClone(reply);
        const view = (training ? buffered.training : buffered.scene)!;
        view.playerShots = [];
        const player = movement.render(reply, bounce * 100 + elapsed)!;
        movement.animateProjectiles(player, buffered, bounce * 100 + elapsed, false);
        assert.equal(view.playerShots.length, 1);
        assert.equal(view.playerShots[0].id, id);
        assert.deepEqual(view.playerShots[0].hitIds, shot.hitIds);
        assert(view.playerShots[0].x >= shot.x);
        assert(
          confirmed.enemies.every((e) => e.hitpoints === 100),
          'presentation never damages enemies',
        );
      }
    }
    const done = structuredClone(source);
    done.serverNow! += 500;
    (training ? done.training : done.scene)!.playerShots = [];
    assert.equal(frame(movement, done, 500).scene.playerShots!.length, 0);
  }
});

test('confirmed talent projectiles coexist with predicted basic attacks without adoption or duplication', () => {
  const source = fixture('mage');
  fireClassAttack(
    source.scene!,
    { ...source.players[0], attackAt: 10000 },
    10000,
    undefined,
    'talent:mage:1',
  );
  const count = source.scene!.playerShots!.length;
  const movement = new LocalMovement('p', () => {});
  const first = frame(movement, source, 0);
  assert.equal(
    first.scene.playerShots!.filter((shot) => shot.abilityId === 'talent:mage:1').length,
    count,
  );
  const next = frame(movement, source, 50);
  assert.equal(
    next.scene.playerShots!.filter((shot) => shot.abilityId === 'talent:mage:1').length,
    count,
  );
});
