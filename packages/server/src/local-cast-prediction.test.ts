import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LocalMovement } from '../../client/src/local-movement.ts';

import { fireClassAttack, requestPlayerCast, PLAYER_ATTACK_INTERVAL } from '@emberfall/core';
import type { ClientMessage } from '@emberfall/common';
import { fixture, frame } from '../../../tests/local-projectiles.fixture.ts';

test('manual confirmations with latency preserve flight and swing, correct aim and never replay completed casts', async () => {
  for (const delay of [100, 150, 300]) {
    for (const classId of ['mage', 'ranger', 'druid'] as const) {
      const source = fixture(classId),
        before = structuredClone(source);
      source.players[0].attackAt = undefined;
      source.players[0].autoAttack = false;
      const requests: Extract<ClientMessage, { type: 'cast' }>[] = [];
      const movement = new LocalMovement('p', (m) => {
        if (m.type === 'cast') {
          requests.push(m);
        }
      });
      const controls = {
        autoAttack: false,
        autoTarget: false,
        attacking: true,
        aimX: 2600,
        aimY: 1280,
      };
      frame(movement, source, 0, { ...controls, attacking: false });
      const cast = frame(movement, source, 10, controls);
      assert.equal(requests.length, 1);
      assert.equal(cast.scene.playerShots![0].castId, requests[0].id);
      const flight = frame(movement, source, 50, controls);
      assert(flight.scene.playerShots![0].x > cast.player.x);
      const reply = structuredClone(source);
      reply.serverNow = 10010 + delay;
      reply.scene!.enemies = [{ ...reply.scene!.enemies[0], id: 3 }];
      assert(requestPlayerCast(reply.scene, reply.players[0], requests[0], reply.serverNow));
      fireClassAttack(reply.scene!, reply.players[0]);
      const confirmed = frame(movement, reply, 50 + delay, { ...controls, attacking: false });
      assert.equal(confirmed.started, false, 'confirmation cannot repeat animation or sound');
      assert.equal(confirmed.player.attackAt, cast.player.attackAt);
      assert.equal(confirmed.scene.playerShots!.length, classId === 'druid' ? 1 : 2);
      assert(confirmed.scene.playerShots![0].x > flight.scene.playerShots![0].x);
      assert.equal(confirmed.scene.playerShots![0].targetId, undefined);
      assert.equal(requests.length, 1);
      assert.equal(confirmed.player.hitpoints, source.players[0].hitpoints);
      assert(
        confirmed.scene.enemies.every((e) => {
          return e.hitpoints === 100;
        }),
      );
      const complete = structuredClone(reply);
      complete.serverNow! += 50;
      complete.scene!.playerShots = [];
      assert.equal(
        frame(movement, complete, 100 + delay, { ...controls, attacking: false }).scene.playerShots!
          .length,
        0,
      );
      assert.equal(
        frame(movement, reply, 150 + delay, { ...controls, attacking: false }).scene.playerShots!
          .length,
        0,
        'old replies cannot resurrect the visual',
      );
      assert.equal(before.players[0].hitpoints, source.players[0].hitpoints);
      assert.equal(
        frame(movement, complete, 710, controls).started,
        false,
        'held casts wait for the authoritative cooldown rather than the predicted launch',
      );
      assert.equal(
        frame(movement, complete, PLAYER_ATTACK_INTERVAL + 49 + delay, controls).started,
        false,
      );
      assert.equal(
        frame(movement, complete, PLAYER_ATTACK_INTERVAL + 50 + delay, controls).started,
        true,
      );
      assert.equal(requests.length, 2);
      assert.equal(requests[1].id, requests[0].id + 1);
    }
  }
});

test('manual rejection removes predicted effects, restores cooldown and keeps request IDs increasing', async () => {
  const source = fixture();
  source.players[0].autoAttack = false;
  source.players[0].attackAt = undefined;
  const requests: Extract<ClientMessage, { type: 'cast' }>[] = [];
  const movement = new LocalMovement('p', (m) => {
    if (m.type === 'cast') {
      requests.push(m);
    }
  });
  const controls = {
    autoAttack: false,
    autoTarget: false,
    attacking: true,
    aimX: 2600,
    aimY: 1280,
  };
  frame(movement, source, 0, { ...controls, attacking: false });
  assert(frame(movement, source, 10, controls).scene.playerShots!.length > 0);
  const reply = structuredClone(source);
  reply.serverNow = 10100;
  reply.players[0].attackAt = 10050;
  assert.equal(requestPlayerCast(reply.scene, reply.players[0], requests[0], 10100), false);
  const rejected = frame(movement, reply, 150, { ...controls, attacking: false });
  assert.equal(rejected.started, false);
  assert.equal(rejected.scene.playerShots!.length, 0);
  assert.equal(rejected.player.attackAt, 100, 'restore the authoritative previous swing phase');
  assert.equal(frame(movement, reply, 700, controls).started, false);
  assert.equal(frame(movement, reply, 1100, controls).started, true);
  assert.equal(requests[1].id, requests[0].id + 1);
  const resume = new LocalMovement('p', () => {});
  const retained = structuredClone(reply);
  retained.players[0].attackAt = undefined;
  frame(resume, retained, 0, { ...controls, attacking: false });
  const next = frame(resume, retained, 10, controls);
  assert.equal(
    next.player.attackId,
    retained.players[0].castSeq! + 1,
    "reconnect continues the server's ID sequence",
  );
});

test('moving casts launch at the displayed player before a reply, with no predicted damage', async () => {
  for (const training of [false, true]) {
    const source = fixture('mage', training),
      before = structuredClone(source);
    const movement = new LocalMovement('p', () => {});
    frame(movement, source, 0);
    movement.input(1, 0, 0);
    const cast = frame(movement, source, 100);
    assert(cast.player.x > source.players[0].x);
    assert.equal(cast.scene.playerShots!.length, 2);
    assert(
      cast.scene.playerShots!.every((s) => {
        return s.x === cast.player.x && s.y === cast.player.y;
      }),
    );
    assert(
      cast.scene.playerShots!.every((s) => {
        return s.castAt === 10100;
      }),
    );
    const flight = frame(movement, source, 150);
    assert(
      flight.scene.playerShots!.every((s) => {
        return s.x > cast.player.x;
      }),
    );
    assert(
      flight.scene.enemies.every((e) => {
        return e.hitpoints === 100;
      }),
    );
    assert.equal(flight.scene.damage.length, 0);
    assert.deepEqual(source, before);
  }
});
