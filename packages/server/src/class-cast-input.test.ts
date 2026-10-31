import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import type { Player } from '@emberfall/common';
import { hero, enemy, scene } from './classes.fixture.ts';

// Base-damage scenarios exclude random criticals; equipment-damage.test.ts covers their boundaries.
beforeEach((t) => {
  if ('mock' in t) t.mock.method(Math, 'random', () => 0.5);
});

test('manual cast requests acknowledge acceptance, cooldown rejection and duplicates without held-input repeats', async () => {
  const { tickPlayerCombat, requestPlayerCast } = await import('@emberfall/core');
  const player = { ...hero(), classId: 'ranger' as const, autoAttack: false };
  const arena = scene();
  arena.enemies = [enemy(1)];
  tickPlayerCombat(arena, [player], 1000, 0.05);
  assert.equal(player.attackAt, undefined);
  Object.assign(player, { attacking: true, combatInputAt: 1000 });
  const cast = (id: number, now: number) =>
    requestPlayerCast(
      arena,
      player,
      {
        type: 'cast',
        id,
        classId: 'ranger',
        epoch: arena.id,
        autoTarget: true,
        aimX: player.x,
        aimY: player.y,
      },
      now,
    );
  assert(cast(1, 1000));
  tickPlayerCombat(arena, [player], 1000, 0.05);
  assert.equal(player.attackAt, 1000);
  assert.equal(arena.playerShots?.length, 2);
  assert.equal(arena.playerShots?.[0].castId, 1);
  player.attacking = false;
  tickPlayerCombat(arena, [player], 1300, 0.05);
  player.attacking = true;
  player.combatInputAt = 1400;
  assert.equal(cast(2, 1400), false);
  assert.equal(player.castSeq, 2);
  assert.equal(player.attackId, 1);
  tickPlayerCombat(arena, [player], 1400, 0.05);
  assert.equal(player.attackAt, 1000);
  assert(cast(3, 2000));
  tickPlayerCombat(arena, [player], 2000, 0.05);
  assert.equal(player.attackAt, 2000);
  assert.equal(cast(3, 3000), false, 'a duplicate ID cannot fire twice');
  tickPlayerCombat(arena, [player], 3000, 0.05);
  assert.equal(player.attackAt, 2000);
  player.autoAttack = true;
  tickPlayerCombat(arena, [player], 3000, 0.05);
  assert.equal(player.attackAt, 3000);
});

test('slightly early held casts wait for cooldown and retain aim without duplicate launches', async () => {
  const { requestPlayerCast, tickPlayerCombat } = await import('@emberfall/core');
  for (const classId of ['mage', 'ranger', 'druid'] as const) {
    const player: Player = { ...hero(), classId, autoAttack: false, autoTarget: false };
    const arena = scene();
    const count = classId === 'druid' ? 1 : 2;
    const cast = (id: number, now: number) =>
      requestPlayerCast(
        arena,
        player,
        {
          type: 'cast',
          id,
          epoch: arena.id,
          classId,
          autoTarget: false,
          aimX: player.x + 200,
          aimY: player.y,
        },
        now,
      );
    assert(cast(1, 1000));
    tickPlayerCombat(arena, [player], 1000, 0);
    assert.equal(cast(2, 1899), false, 'requests beyond the buffer are rejected');
    assert(cast(3, 1900));
    assert.equal(player.attackAt, 2000, 'the server still enforces the full cooldown');
    assert.equal(cast(4, 1950), false, 'another request cannot replace the buffered cast');
    player.aimY = player.y + 200;
    tickPlayerCombat(arena, [player], 1999, 0);
    assert.equal(arena.playerShots!.length, count);
    tickPlayerCombat(arena, [player], 2000, 0);
    assert.equal(arena.playerShots!.length, count * 2);
    assert.equal(arena.playerShots![count].castId, 3);
    assert.equal(
      arena.playerShots![count].angle,
      classId === 'druid' ? 0 : -Math.PI / 60,
      'buffered casts retain request aim',
    );
    tickPlayerCombat(arena, [player], 2050, 0);
    assert.equal(arena.playerShots!.length, count * 2, 'buffered casts fire once');
    for (let id = 5; id < 15; id++) {
      assert(cast(id, player.attackAt + 950));
      tickPlayerCombat(arena, [player], player.attackAt, 0);
      assert.equal(arena.playerShots!.at(-1)!.castId, id);
    }

    assert.equal(player.attackAt, 12000, 'repeated early arrivals never shorten cooldown');
  }
});

test('accepted manual projectiles use request aim even if the cursor moves before the combat tick', async () => {
  const { requestPlayerCast, tickPlayerCombat } = await import('@emberfall/core');
  const player = { ...hero(), classId: 'ranger' as const, autoAttack: false, autoTarget: false };
  const arena = scene();
  assert(
    requestPlayerCast(
      arena,
      player,
      {
        type: 'cast',
        id: 1,
        epoch: arena.id,
        classId: 'ranger',
        autoTarget: false,
        aimX: 2600,
        aimY: 1280,
      },
      1000,
    ),
  );
  player.aimX = 2400;
  player.aimY = 1500;
  tickPlayerCombat(arena, [player], 1050, 0);
  assert.equal(arena.playerShots![0].angle, -Math.PI / 60);
  assert.equal(arena.playerShots![0].castId, 1);
  assert.equal(arena.playerShots![0].targetX, 2600);
});
