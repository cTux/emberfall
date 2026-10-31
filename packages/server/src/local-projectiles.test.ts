import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LocalMovement } from '../../client/src/local-movement.ts';
import { SnapshotBuffer } from '../../client/src/snapshots.ts';

import { fireClassAttack, PLAYER_ATTACK_INTERVAL } from '@emberfall/core';
import type { WorldState } from '@emberfall/common';
import { fixture, frame } from '../../../tests/local-projectiles.fixture.ts';

test('automatic combat entry waits for its first authoritative swing in forest and training', () => {
  for (const training of [false, true]) {
    for (const classId of ['warrior', 'mage', 'ranger', 'druid'] as const) {
      const source = fixture(classId, training);
      source.players[0].attackAt = undefined;
      const movement = new LocalMovement('p', () => {});

      for (const now of [0, 25, 75, 150]) {
        const waiting = frame(movement, source, now);
        assert.equal(waiting.started, false, 'no invented first swing or sound');
        assert.equal(waiting.player.attackAt, undefined);
        assert.equal(waiting.scene.playerShots?.length ?? 0, 0);
      }

      const confirmed = structuredClone(source);
      confirmed.serverNow = 10200;
      confirmed.players[0].attackAt = 10150;
      const first = frame(movement, confirmed, 200);
      assert.equal(first.started, true);
      assert.equal(first.player.attackAt, 150, "use the server's actual swing age");
      assert.equal(frame(movement, confirmed, 225).started, false);
      const next = structuredClone(confirmed);
      next.serverNow = 10250;
      assert.equal(
        frame(movement, next, 250).started,
        false,
        'snapshot does not restart the swing',
      );
      assert.equal(frame(movement, next, 250).player.attackAt, 150);
      assert.equal(
        frame(movement, next, 150 + PLAYER_ATTACK_INTERVAL).started,
        true,
        'keep extrapolating established automatic cycles',
      );
    }
  }
});

test('all local attacks stop on stale or paused snapshots and resume from fresh server state', async () => {
  for (const training of [false, true]) {
    for (const classId of ['warrior', 'mage', 'ranger', 'druid'] as const) {
      const source = fixture(classId, training),
        before = structuredClone(source);
      const movement = new LocalMovement('p', () => {});
      const attack = (world: WorldState, now: number) => {
        const player = movement.render(world, now)!;
        const view = structuredClone(world);
        const started = movement.animateAttack(player, view, now);
        movement.animateProjectiles(player, view, now, started);

        return { player, started, scene: (training ? view.training : view.scene)! };
      };

      attack(source, 0);
      assert.equal(attack(source, 100).started, true);
      assert.notEqual(attack(source, 1000).player.attackAt, undefined);

      for (const now of [1001, 1500, 2200]) {
        const stale = attack(source, now);
        assert.equal(stale.started, false, 'no new swing or slash sound without server updates');
        assert.equal(stale.player.attackAt, undefined);
        assert.equal(stale.scene.playerShots?.length ?? 0, 0);
      }

      const older = structuredClone(source);
      older.serverNow = 9950;
      assert.equal(attack(older, 2250).started, false, 'an old packet cannot restart prediction');
      const fresh = structuredClone(source);
      fresh.serverNow = 12200;
      fresh.players[0].attackAt = 12200;
      const resumed = attack(fresh, 2300);
      assert.equal(resumed.started, true);
      assert.equal(resumed.player.attackAt, 2300);
      assert.equal(attack(fresh, 2316).started, false, 'resume starts only one swing');
      const paused = structuredClone(fresh);
      paused.serverNow = 12250;
      (training ? paused.training : paused.scene)!.pausedAt = 12250;
      const stopped = attack(paused, 2350);
      assert.equal(stopped.started, false);
      assert.equal(stopped.player.attackAt, undefined);
      assert.equal(stopped.scene.playerShots?.length ?? 0, 0);
      assert.deepEqual(source, before);
    }
  }
});

test('training snapshots are detached before local projectile rendering', async () => {
  const source = fixture('mage', true),
    before = structuredClone(source);
  const snapshots = new SnapshotBuffer('p'),
    movement = new LocalMovement('p', () => {});
  snapshots.push(source, 0);
  movement.render(source, 0);
  const player = movement.render(source, 100)!;
  const view = snapshots.render(100)!;
  movement.animateProjectiles(player, view, 100, movement.animateAttack(player, view, 100));
  assert.equal(view.training!.playerShots!.length, 2);
  assert.deepEqual(source, before);
});

test('a snapshot timestamp alone cannot reject an automatic cast before the server attacks', () => {
  const source = fixture('ranger');
  const movement = new LocalMovement('p', () => {});
  frame(movement, source, 0);
  assert.equal(frame(movement, source, 100).scene.playerShots!.length, 2);
  const early = structuredClone(source);
  early.serverNow = 10100;
  // The timestamp advanced but the attack phase still belongs to the previous cycle.
  assert.equal(frame(movement, early, 150).scene.playerShots!.length, 2);
  const accepted = structuredClone(early);
  accepted.serverNow = 10150;
  accepted.players[0].attackAt = 10100;
  fireClassAttack(accepted.scene!, accepted.players[0]);
  assert.equal(frame(movement, accepted, 200).scene.playerShots!.length, 2);
});
