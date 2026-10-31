import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { FOREST, clientMessage, fireClassAttack, tickPlayerShots } from '@emberfall/core';
import type { Player } from '@emberfall/common';
import { hero, enemy, scene } from './classes.fixture.ts';

// Base-damage scenarios exclude random criticals; equipment-damage.test.ts covers their boundaries.
beforeEach((t) => {
  if ('mock' in t) {
    t.mock.method(Math, 'random', () => {
      return 0.5;
    });
  }
});

test('manual cast eligibility rejects stale areas/classes, death and inactive combat', async () => {
  const { requestPlayerCast } = await import('@emberfall/core');
  for (const reason of [
    'area',
    'class',
    'dead',
    'paused',
    'ended',
    'outside',
    'missing',
  ] as const) {
    const player: Player = { ...hero(), classId: 'mage', autoAttack: false };
    const arena = scene();
    const request = {
      type: 'cast' as const,
      id: 1,
      classId: 'mage' as const,
      epoch: arena.id,
      autoTarget: false,
      aimX: 2600,
      aimY: 1280,
    };
    if (reason === 'area') {
      request.epoch = 'expired';
    }

    if (reason === 'class') {
      player.classId = 'ranger';
    }

    if (reason === 'dead') {
      player.hitpoints = 0;
    }

    if (reason === 'paused') {
      arena.pausedAt = 1000;
    }

    if (reason === 'ended') {
      arena.phase = 'ended';
    }

    if (reason === 'outside') {
      player.scene = undefined;
      request.epoch = 'lobby';
    }

    assert.equal(
      requestPlayerCast(reason === 'missing' ? undefined : arena, player, request, 1000),
      false,
      reason,
    );
    assert.equal(player.castSeq, 1, 'rejected requests are acknowledged');
    assert.equal(player.attackAt, undefined);
    assert.equal(player.attackId, undefined);
  }

  for (const bad of [{ id: 0 }, { id: 1.5 }, { aimX: Infinity }, { classId: 'unknown' }]) {
    assert.equal(
      clientMessage.safeParse({
        type: 'cast',
        id: 1,
        epoch: 'lobby',
        classId: 'mage',
        autoTarget: false,
        aimX: 0,
        aimY: 0,
        ...bad,
      }).success,
      false,
    );
  }
});

test('untargeted spells follow cast aim past the cursor and expire after 1000px', async () => {
  const { advancePlayerShot, playerAimAngle } = await import('@emberfall/core');
  for (const classId of ['mage', 'ranger', 'druid'] as const) {
    for (const autoAttack of [false, true]) {
      const player: Player = {
        ...hero(),
        classId,
        autoAttack,
        autoTarget: false,
        aimX: 2400,
        aimY: 1300,
      };
      const arena = scene();
      arena.enemies = [enemy(1, 2440), enemy(2, 2580)];
      fireClassAttack(arena, player, 1000);
      assert.equal(arena.playerShots?.length, classId === 'druid' ? 1 : 2);
      const shot = arena.playerShots[0];
      assert.equal(shot.targetId, undefined);
      assert.equal(shot.angle, Math.PI / 2 - (classId === 'druid' ? 0 : Math.PI / 60));
      assert.equal(shot.remaining, 1000);
      assert(
        arena.enemies.every((e) => {
          return e.debuffs === undefined;
        }),
      );
      player.aimX = 2600;
      player.aimY = 1280;
      assert.equal(advancePlayerShot(shot, arena.enemies, 1), false);
      assert(shot.x >= player.x);
      assert(shot.y > 1300, 'continues beyond cursor without turning');
      tickPlayerShots(arena, [player], 4000, 10);
      assert.equal(arena.playerShots.length, 0);
      assert(
        Math.abs(shot.y - (player.y + 1000 * Math.cos(classId === 'druid' ? 0 : Math.PI / 60))) <
          0.001,
      );
      assert.equal(arena.explosions?.length, 0);
      assert(
        arena.enemies.every((e) => {
          return e.hitpoints === 100 && e.debuffs === undefined;
        }),
      );
    }

    const player: Player = { ...hero(), classId, autoTarget: false, aimX: 2600, aimY: 1280 };
    const arena = scene();
    arena.enemies = [enemy(1, 2480)];
    fireClassAttack(arena, player, 1000);
    tickPlayerShots(arena, [player], 1500, 0.5);
    if (classId === 'druid') {
      assert.equal(arena.enemies[0].debuffs?.[0].kind, 'roots');
      assert.equal(arena.playerShots!.length, 0);
    } else {
      assert(arena.enemies[0].hitpoints < 100);
    }

    player.x = FOREST.width - 10;
    player.aimX = 10;
    assert.equal(playerAimAngle(player, []), 0);
    arena.enemies = [];
    arena.playerShots = [];
    fireClassAttack(arena, player, 2000);
    const shot = arena.playerShots[0];
    advancePlayerShot(shot, [], 10);
    assert(
      Math.abs(shot.x - (1000 * Math.cos(classId === 'druid' ? 0 : Math.PI / 60) - 10)) < 0.001,
      'range is distance travelled across wrapped edges',
    );
  }
});

test('manual client prediction casts on hold, preserves release cooldown, and tracks cursor', async () => {
  const { LocalMovement } = await import('../../client/src/local-movement.ts');
  const player: Player = {
    ...hero(),
    autoAttack: false,
    autoTarget: false,
    aimX: 2400,
    aimY: 1500,
  };
  const arena = scene();
  const world = {
    id: 'w',
    name: 'W',
    hostId: 'p',
    players: [player],
    scene: arena,
    serverNow: 10000,
  };
  const movement = new LocalMovement('p', () => {});
  const displayed = movement.render(world, 0)!;
  assert.equal(movement.animateAttack(displayed, world, 0), false);
  assert.equal(displayed.attackAt, undefined);
  assert.equal(displayed.attackAngle, Math.PI / 2);
  displayed.attacking = true;
  assert.equal(movement.animateAttack(displayed, world, 10), true);
  displayed.attacking = false;
  assert.equal(movement.animateAttack(displayed, world, 400), false);
  displayed.attacking = true;
  assert.equal(movement.animateAttack(displayed, world, 600), false);
  movement.render({ ...world, serverNow: 11000 }, 1000);
  assert.equal(movement.animateAttack(displayed, world, 1009), false);
  assert.equal(movement.animateAttack(displayed, world, 1010), true);
  assert.equal(movement.animateAttack(displayed, world, 1020), false);
});
