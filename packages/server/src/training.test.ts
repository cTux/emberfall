import { test } from 'node:test';

import assert from 'node:assert/strict';
import {
  ARENA,
  TRAINING_ZONES,
  inTrainingZone,
  WARDROBE,
  forestDistance,
  wrappedDelta,
  tickTraining,
  tickPlayerCombat,
  hitEnemy,
} from '@emberfall/core';
import { LocalMovement } from '../../client/src/local-movement.ts';

import { hero } from './training.fixture.ts';

test('boar leaves its wardrobe spawn, follows its owner and attacks training targets', () => {
  const p = {
    ...hero(),
    classId: 'druid' as const,
    x: WARDROBE.x,
    y: WARDROBE.y - 15,
    attackAt: 1e6,
  };
  const s = tickTraining(undefined, [p], 10000, 0);
  p.x = 480;
  p.y = 360;
  for (let now = 10050; now <= 12000; now += 50) tickTraining(s, [p], now, 0.05);
  assert(forestDistance(p.bear!, p) <= 20.01, 'boar must escape the wardrobe and follow');
  p.x = TRAINING_ZONES[0].x + 35;
  p.y = 355;
  let bearHit = false;
  for (let now = 12050; now <= 16000; now += 50) {
    tickTraining(s, [p], now, 0.05);
    bearHit ||= s.damage.some((hit) => hit.amount === 3 || hit.amount === 4.5);
  }
  assert(bearHit, 'boar must chase and hit the dummy');
  assert.equal(p.experience, 0);
});

test('training has one and six stationary, harmless targets and regenerates every second', (t) => {
  t.mock.method(Math, 'random', () => 0.5);
  const p = hero();
  let s = tickTraining(undefined, [], 10000, 0);
  const positions = s.enemies.map(({ x, y }) => ({ x, y }));
  assert.equal(s.enemies.length, 7);
  assert.equal(s.enemies.filter((e) => e.x === TRAINING_ZONES[0].x).length, 1);
  assert.deepEqual(
    s.enemies.slice(1).map((e) => e.y),
    [315, 355, 355, 395, 395, 395],
  );
  assert(s.enemies.every((e) => e.hitpoints === 1e9 && e.maxHitpoints === 1e9));
  assert(s.enemies.every((e) => e.archetype === 'skeleton'));
  tickPlayerCombat(s, [p], 10000, 0);
  assert.equal(s.enemies[0].hitpoints, 1e9 - 5);
  hitEnemy(s, s.enemies[1], 1e9 + 50, p, 10000);
  assert.equal(p.experience, 0);
  assert.equal(s.drops, undefined);
  s = tickTraining(s, [], 10999, 0.05);
  assert.equal(s.enemies[0].hitpoints, 1e9 - 5);
  s = tickTraining(s, [], 11000, 0.05);
  assert(s.enemies.every((e) => e.hitpoints === 1e9 && !e.attack));
  assert.deepEqual(
    s.enemies.map(({ x, y }) => ({ x, y })),
    positions,
  );
  assert.equal(p.hitpoints, p.maxHitpoints);
  assert.equal(s.projectiles, undefined);
});

test('training area boundaries gate server attacks, Bear hunting, and client swing prediction', async () => {
  for (const zone of TRAINING_ZONES) {
    assert(inTrainingZone({ x: zone.x + 200, y: zone.y - 15 }));
    assert(inTrainingZone({ x: zone.x, y: zone.y - 15 + 180 }));
    assert(inTrainingZone({ x: zone.x + zone.radius, y: zone.y - 15 }));
    assert(!inTrainingZone({ x: zone.x + zone.radius + 0.01, y: zone.y - 15 }));
    assert(inTrainingZone({ x: zone.x, y: zone.y - 15 + zone.radius * 0.85 - 0.01 }));
    assert(!inTrainingZone({ x: zone.x, y: zone.y - 15 + zone.radius * 0.85 + 0.01 }));
  }
  for (const classId of ['warrior', 'ranger', 'mage', 'druid'] as const) {
    const p = { ...hero(), classId, x: 480, y: 340 };
    const s = tickTraining(undefined, [p], 10000, 0.05);
    assert.equal(p.attackAt, undefined);
    assert.equal(p.bear?.attackAt, undefined);
    assert.equal(s.playerShots?.length ?? 0, 0);
    assert.equal(s.damage.length, 0);
    const movement = new LocalMovement(p.id, () => {});
    const world = {
      id: 'test',
      name: 'test',
      hostId: p.id,
      players: [p],
      training: s,
      serverNow: 10000,
    };
    movement.render(world, 0);
    assert.equal(movement.animateAttack(p, world, 0), false);
    p.x = 300;
    tickTraining(s, [p], 10050, 0.05);
    assert.equal(p.attackAt, 10050);
    const confirmed = { ...world, serverNow: 10050, players: [{ ...p }] };
    const displayed = movement.render(confirmed, 50)!;
    assert(movement.animateAttack(displayed, confirmed, 50));
    assert.equal(displayed.attackAt, 50);
    p.x = 480;
    tickTraining(s, [p], 10100, 0.05);
    assert.equal(p.attackAt, undefined);
    assert.equal(p.bear?.attackAt, undefined);
    assert.equal(movement.animateAttack(p, world, 100), false);
    assert.equal(p.attackAt, undefined);
  }
});

test('all lobby classes damage dummies, Bear contributes, and forest players cannot attack them', async () => {
  for (const classId of ['warrior', 'ranger', 'mage', 'druid'] as const) {
    const p = { ...hero(), classId, x: TRAINING_ZONES[0].x + 35 };
    const s = tickTraining(undefined, [p], 10000, 0.05);
    for (let now = 10050; now < 11000; now += 50) tickTraining(s, [p], now, 0.05);
    assert(s.enemies[0].hitpoints < 1e9, classId);
    assert(p.dps! > 0, classId);
    if (classId === 'druid') assert(p.bear?.attackAt !== undefined);
  }
  const p = { ...hero(), scene: 'forest' as const };
  const s = tickTraining(undefined, [p], 10000, 0.05);
  assert(s.enemies.every((e) => e.hitpoints === 1e9));
});

test('boar reaches a stationary dummy from every side and keeps landing tusk attacks', async () => {
  for (const [dx, dy] of [
    [110, 0],
    [-110, 0],
    [0, 90],
    [0, -110],
    [78, 78],
    [-78, -78],
  ]) {
    const p = {
      ...hero(),
      classId: 'druid' as const,
      x: TRAINING_ZONES[0].x + dx,
      y: TRAINING_ZONES[0].y + dy,
      attackAt: 1e6,
    };
    assert(inTrainingZone(p));
    const s = tickTraining(undefined, [p], 10000, 0.05);
    for (let now = 10050; now <= 12500; now += 50) tickTraining(s, [p], now, 0.05);
    const bear = p.bear!,
      dummy = s.enemies[0];
    assert(
      Math.abs(
        Math.hypot(
          wrappedDelta(bear.x, dummy.x, ARENA.width),
          wrappedDelta(bear.y, dummy.y, ARENA.height),
        ) - 80,
      ) < 1e-6,
    );
    assert.equal(bear.moving, false);
    assert(p.dps! >= 1.2, 'at least three boar hits, with player roots disabled');
    assert(s.damage.some((hit) => hit.amount === 3 || hit.amount === 4.5));
    assert.equal(dummy.x, TRAINING_ZONES[0].x);
    assert.equal(dummy.y, TRAINING_ZONES[0].y);
  }
});
