import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { FOREST, ARENA, forestDistance } from '@emberfall/core';
import { stepCombat, tickCompanion } from '@emberfall/core';
import type { Player } from '@emberfall/common';
import { hero, enemy, scene } from './classes.fixture.ts';

// Base-damage scenarios exclude random criticals; equipment-damage.test.ts covers their boundaries.
beforeEach((t) => {
  if ('mock' in t) t.mock.method(Math, 'random', () => 0.5);
});

test('Bear moves at player speed in forest and village', async () => {
  for (const forest of [true, false]) {
    const p: Player = {
      ...hero(),
      classId: 'druid',
      scene: forest ? 'forest' : undefined,
      x: forest ? 2400 : 480,
      y: forest ? 1280 : 360,
    };
    tickCompanion(p, undefined, 10000, 0);
    p.bear!.x -= 100;
    const start = { x: p.bear!.x, y: p.bear!.y };
    tickCompanion(p, undefined, 10050, 0.05);
    assert(
      Math.abs(Math.hypot(p.bear!.x - start.x, p.bear!.y - start.y) - ARENA.speed * 0.05) < 1e-6,
    );
  }
});

test('Bear dodges telegraphed attacks and sidesteps incoming projectiles', async () => {
  const s = scene(),
    p: Player = { ...hero(), classId: 'druid' };
  tickCompanion(p, s, 10000, 0);
  const bear = p.bear!,
    e = enemy(1, 2460);
  s.enemies = [e];
  e.attack = { startedAt: 11000, endsAt: 11500, x: bear.x, y: bear.y, radius: 40, ranged: false };
  tickCompanion(p, s, 11000, 0.4);
  assert(forestDistance(bear, e.attack) > e.attack.radius);
  e.attack = undefined;
  const safeX = bear.x;
  tickCompanion(p, s, 11999, 0.05);
  assert(
    Math.abs(bear.x - safeX) < 1e-6,
    'do not strafe back to the attack point between decisions',
  );
  assert.equal(bear.moving, false);
  bear.x = p.x;
  bear.y = p.y;
  s.projectiles = [{ id: 2, x: bear.x - 70, y: bear.y, vx: 210, vy: 0, expiresAt: 14000 }];
  tickCompanion(p, s, 12000, 0.05);
  assert(bear.y > p.y);
  p.x = 2280;
  p.attackAt = 1e6;
  for (let i = 1; i <= 8; i++) stepCombat(s, [p], 12000 + i * 50, 0.05);
  assert.equal(bear.hitpoints, 150);
  assert(s.projectiles.some((shot) => shot.x > 2400));
});

test('Bear teleports only beyond 500 pixels, using wrapped forest distance, without bypassing death', async () => {
  for (const forest of [true, false]) {
    const p: Player = {
      ...hero(),
      classId: 'druid',
      scene: forest ? 'forest' : undefined,
      x: forest ? 2400 : 100,
      y: forest ? 1280 : 360,
    };
    tickCompanion(p, undefined, 10000, 0);
    const bear = p.bear!;
    bear.x = p.x + 500;
    tickCompanion(p, undefined, 10050, 0);
    assert.equal(bear.x, p.x + 500);
    bear.x++;
    bear.attackAt = 10000;
    tickCompanion(p, undefined, 10100, 0.05);
    assert.equal(bear.x, p.x);
    assert.equal(bear.y, p.y);
    assert.equal(bear.moving, false);
    assert.equal(bear.returning, false);
    assert.equal(bear.attackAt, undefined);
    bear.x += 501;
    bear.hitpoints = 0;
    tickCompanion(p, undefined, 10150, 0);
    assert.equal(bear.x, p.x + 501);
    assert.equal(bear.resurrectAt, 15150);
  }
  const p: Player = { ...hero(), classId: 'druid', x: 5 };
  tickCompanion(p, undefined, 10000, 0);
  p.bear!.x = FOREST.width - 5;
  tickCompanion(p, undefined, 10050, 0);
  assert.equal(p.bear!.x, FOREST.width - 5, 'nearby seam neighbors must not teleport');
  p.bear!.x = FOREST.width - 496;
  tickCompanion(p, undefined, 10100, 0);
  assert.equal(p.bear!.x, p.x);
});

test('enemies damage Bear; death resurrects exactly five seconds later at its owner', async () => {
  const s = scene(),
    p: Player = { ...hero(), classId: 'druid', attackAt: 10000 };
  tickCompanion(p, s, 10000, 0);
  const bear = p.bear!;
  bear.x = 2470;
  bear.hitpoints = 3;
  const e = enemy(1, 2470);
  e.attack = { startedAt: 9000, endsAt: 10000, x: 2470, y: 1280, radius: 40, ranged: false };
  s.enemies = [e];
  stepCombat(s, [p], 10000, 0);
  assert.equal(bear.hitpoints, 0);
  assert.equal(p.hitpoints, 100);
  assert.equal(bear.resurrectAt, 15000);
  p.maxHitpoints = 120;
  tickCompanion(p, s, 14999, 0);
  assert.equal(bear.hitpoints, 0);
  tickCompanion(p, s, 15000, 0);
  assert.equal(bear.hitpoints, 180);
  assert.equal(bear.x, p.x);
  assert.equal(bear.resurrectAt, undefined);
  const hitpoints = bear.hitpoints;
  s.projectiles = [{ id: 50, x: bear.x, y: bear.y, vx: 0, vy: 0, expiresAt: 20000 }];
  p.x -= 80;
  p.attackAt = 15000;
  stepCombat(s, [p], 15100, 0);
  assert.equal(bear.hitpoints, hitpoints - 3);
});

test('bear wraps its leash and follows in the village; other classes remove companions', async () => {
  const p: Player = { ...hero(), classId: 'druid', x: 5 };
  tickCompanion(p, scene(), 10000, 0);
  p.bear!.x = FOREST.width - 40;
  tickCompanion(p, scene(), 10050, 0);
  assert(!p.bear!.returning);
  p.scene = undefined;
  p.x = 480;
  p.y = 360;
  p.bear!.x = 550;
  p.bear!.y = 360;
  tickCompanion(p, undefined, 10100, 0.05);
  assert(p.bear!.x < 550);
  p.classId = 'mage';
  tickCompanion(p, undefined, 10150, 0);
  assert.equal(p.bear, undefined);
});
