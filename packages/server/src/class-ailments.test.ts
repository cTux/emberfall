import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { stepCombat, hitEnemy, tickDebuffs } from '@emberfall/core';

import { hero, enemy, scene } from './classes.fixture.ts';

// Base-damage scenarios exclude random criticals; equipment-damage.test.ts covers their boundaries.
beforeEach((t) => {
  if ('mock' in t) t.mock.method(Math, 'random', () => 0.5);
});

test('each ailment stacks, refreshes its timer, ticks once per second, and expires after five seconds', (t) => {
  t.mock.method(Math, 'random', () => 0.09);
  for (const kind of ['bleed', 'poison', 'burn'] as const) {
    const s = scene(),
      p = hero(),
      e = enemy(1, 2480, 10000);
    s.enemies = [e];
    hitEnemy(s, e, 5, p, 0, kind);
    tickDebuffs(s, [p], 999);
    assert.equal(e.hitpoints, 9995);
    tickDebuffs(s, [p], 1000);
    assert.equal(e.hitpoints, 9994);
    hitEnemy(s, e, 5, p, 1500, kind);
    assert.equal(e.debuffs![0].stacks, 2);
    assert.equal(e.debuffs![0].expiresAt, 6500);
    tickDebuffs(s, [p], 2000);
    assert.equal(e.hitpoints, 9987);
    const before = e.hitpoints;
    tickDebuffs(s, [p], 6500);
    assert.equal(e.hitpoints, before - 8);
    assert.equal(e.debuffs!.length, 0);
    tickDebuffs(s, [p], 9000);
    assert.equal(e.hitpoints, before - 8);
    for (let i = 0; i < 100; i++) hitEnemy(s, e, 1, p, 10000, kind);
    assert.equal(e.debuffs![0].stacks, 100);
  }
});

test('proc boundary is ten percent; DOT kills use the same loot, XP and boss completion paths', (t) => {
  t.mock.method(Math, 'random', () => 0.1);
  const s = scene(),
    p = hero(),
    e = enemy(1, 2480, 10);
  s.enemies = [e];
  hitEnemy(s, e, 5, p, 0, 'bleed');
  assert.equal(e.debuffs, undefined);
  e.kind = 'boss';
  s.bossId = e.id;
  e.debuffs = [{ kind: 'burn', stacks: 5, expiresAt: 5000, nextTick: 1000, ownerId: p.id }];
  p.x = 2000;
  p.attackAt = 2000;
  stepCombat(s, [p], 1000, 0);
  assert.equal(s.phase, 'ended');
  assert.equal(p.experience, 1);
  assert.deepEqual(
    s.drops!.map((drop) => drop.kind),
    ['experience', 'item', 'item'],
  );
});
