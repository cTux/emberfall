import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { FOREST, forestDistance, stepCombat, tickCompanion } from '@emberfall/core';
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

test('bear swipes once per enemy per cycle for owner power, leashes, returns and resumes', async () => {
  const s = scene(),
    p: Player = { ...hero(), classId: 'druid' };
  s.enemies = [enemy(1, 2440), enemy(2, 2460)];
  tickCompanion(p, s, 10000, 0);
  const bear = p.bear!;
  assert.equal(bear.name, 'Bear');
  assert.equal(bear.maxHitpoints, 150);
  assert.deepEqual(
    s.enemies.map((e) => {
      return e.hitpoints;
    }),
    [97, 97],
  );
  tickCompanion(p, s, 10050, 0);
  assert.deepEqual(
    s.enemies.map((e) => {
      return e.hitpoints;
    }),
    [97, 97],
  );
  tickCompanion(p, s, 10999, 0);
  assert.deepEqual(
    s.enemies.map((e) => {
      return e.hitpoints;
    }),
    [97, 97],
  );
  tickCompanion(p, s, 11000, 0);
  assert.deepEqual(
    s.enemies.map((e) => {
      return e.hitpoints;
    }),
    [94, 94],
  );
  bear.x = p.x + 220;
  tickCompanion(p, s, 11400, 0.05);
  assert(bear.returning);
  assert.equal(bear.attackAt, undefined);
  assert(bear.x < p.x + 220);
  bear.x = p.x + 60;
  tickCompanion(p, s, 11450, 0);
  assert(bear.returning);
  bear.x = p.x + 19;
  tickCompanion(p, s, 11500, 0);
  assert(!bear.returning);
  tickCompanion(p, s, 12400, 0);
  assert.deepEqual(
    s.enemies.map((e) => {
      return e.hitpoints;
    }),
    [91, 91],
  );
});

test("bear only targets and chases inside the owner's 200-unit radius, including wrapped edges", async () => {
  const s = scene(),
    p: Player = { ...hero(), classId: 'druid' };
  const e = enemy(1, p.x + 201);
  s.enemies = [e];
  tickCompanion(p, s, 10000, 0.05);
  const bear = p.bear!;
  assert.equal(bear.x, p.x);
  assert.equal(bear.attackAt, undefined);
  e.x = p.x + 200;
  tickCompanion(p, s, 11000, 0.05);
  assert(bear.x > p.x);
  assert.equal(bear.attackAt, 11000);
  bear.x = p.x + 40;
  const chasedX = bear.x;
  e.x = p.x + 201;
  tickCompanion(p, s, 11050, 0.05);
  assert(bear.x < chasedX);
  assert.equal(bear.attackAt, undefined);
  bear.x = p.x + 200;
  tickCompanion(p, s, 11100, 0);
  assert(!bear.returning);
  bear.x = p.x + 201;
  tickCompanion(p, s, 11150, 0);
  assert(bear.returning);
  p.x = 5;
  bear.x = 5;
  bear.returning = false;
  e.x = FOREST.width - 196;
  tickCompanion(p, s, 12000, 0);
  assert.equal(bear.attackAt, undefined);
  e.x = FOREST.width - 195;
  tickCompanion(p, s, 13000, 0);
  assert.equal(bear.attackAt, 13000);
});

test('Bear stops in claw range, backs away from close enemies, and preserves spacing across seams', async () => {
  const s = scene(),
    p: Player = { ...hero(), classId: 'druid', x: 2300 };
  const e = enemy(1, 2480);
  s.enemies = [e];
  tickCompanion(p, s, 10000, 1);
  const bear = p.bear!;
  assert.equal(forestDistance(bear, e), 80);
  assert.equal(e.hitpoints, 97);
  const stoppedX = bear.x;
  tickCompanion(p, s, 10050, 0.05);
  assert.equal(bear.x, stoppedX);
  assert.equal(bear.moving, false);
  e.x = bear.x + 20;
  tickCompanion(p, s, 10999, 0.05);
  assert.equal(bear.x, stoppedX, 'hold the destination until one second has elapsed');
  tickCompanion(p, s, 11000, 0.4);
  assert.equal(forestDistance(bear, e), 80);
  assert(bear.x < stoppedX);
  assert.equal(bear.moving, true);
  p.x = 5;
  bear.x = FOREST.width - 20;
  e.x = 25;
  tickCompanion(p, s, 12000, 0.4);
  assert.equal(forestDistance(bear, e), 80);
  assert.equal(e.hitpoints, 91);
});

test('Bear repositions on its reaction interval while continuing to damage melee enemies', async () => {
  for (const archetype of ['skeleton', 'runner', 'brute'] as const) {
    const s = scene(),
      p: Player = { ...hero(), classId: 'druid', x: 2300, attackAt: 1e6 };
    const e = { ...enemy(1, 2480, 1000), archetype };
    s.enemies = [e];
    tickCompanion(p, s, 10000, 1);

    for (let i = 1; i <= 40; i++) {
      stepCombat(s, [p], 10000 + i * 50, 0.05);
    }

    assert(p.bear!.hitpoints > 0, archetype);
    assert(e.hitpoints < 998, archetype);
    tickCompanion(p, s, 13000, 0.5);
    assert(Math.abs(forestDistance(p.bear!, e) - 80) < 1e-6, archetype);
  }
});
