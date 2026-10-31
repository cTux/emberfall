import { test } from 'node:test';
import { executeTalent } from '../../core/src/talent-effects.ts';
import assert from 'node:assert/strict';
import {
  FOREST,
  tickTraining,
  tickDebuffs,
  createTrainingScene,
  hitEnemy,
  fireClassAttack,
  damagePerSecond,
  hitWithWeapon,
} from '@emberfall/core';

import { hero } from './training.fixture.ts';

test('DPS counts actual damage once, attributes ailments and Bear, and expires after five seconds', async () => {
  const p = hero(),
    other = { ...hero(), id: 'other' };
  const s = tickTraining(undefined, [], 10000, 0);
  s.enemies[0].hitpoints = 3;
  hitEnemy(s, s.enemies[0], 5, p, 10000);
  hitEnemy(s, s.enemies[0], 5, p, 10000);
  assert.equal(damagePerSecond(p, 10000), 0.6);
  assert.equal(damagePerSecond(other, 10000), 0);
  assert.equal(damagePerSecond(p, 14999), 0.6);
  assert.equal(damagePerSecond(p, 15000), 0);
});

test('roots include exactly 250 units, exclude farther targets, and work across forest edges', async () => {
  const p = { ...hero(), classId: 'druid' as const };
  const s = tickTraining(undefined, [], 10000, 0);
  s.enemies = [250, 250.01, 249].map((distance, id) => {
    return {
      id,
      x: p.x + distance,
      y: p.y,
      angle: 0,
      hitpoints: 100,
    };
  });
  fireClassAttack(s, p, 10000);
  assert.deepEqual(
    s.playerShots!.map((shot) => {
      return shot.targetId;
    }),
    [2],
  );
  assert(
    s.enemies.every((e) => {
      return e.debuffs === undefined;
    }),
  );
  p.x = 5;
  s.enemies = [{ id: 4, x: FOREST.width - 245, y: p.y, angle: 0, hitpoints: 100 }];
  fireClassAttack(s, p, 10000);
  assert.deepEqual(
    s.playerShots!.slice(-1).map((shot) => {
      return shot.targetId;
    }),
    [4],
  );
});

test('Silence is a shared non-damaging debuff and expires without producing combat hits', () => {
  const scene = createTrainingScene(0);
  const target = scene.enemies[0];
  const health = target.hitpoints;
  target.debuffs = [{ kind: 'silence', stacks: 1, expiresAt: 5000, nextTick: 1000, ownerId: 'p' }];
  tickDebuffs(scene, [hero()], 4000);
  assert.equal(target.hitpoints, health);
  assert.equal(scene.damage.length, 0);
  assert.equal(target.debuffs.length, 1);
  tickDebuffs(scene, [hero()], 5000);
  assert.equal(target.debuffs.length, 0);
  assert.equal(scene.damage.length, 0);
});

test('damage totals attribute weapons, Bear, ailments and talents, expire DPS and reset by class', () => {
  const p = hero();
  const scene = createTrainingScene(10000);
  const enemy = scene.enemies[0];
  enemy.x = p.x;
  enemy.y = p.y;
  enemy.hitpoints = 10000;
  hitWithWeapon(scene, enemy, p, 10000);
  assert(p.damageMeter!.abilities.Slash.damage > 0);
  executeTalent(scene, p, 0, 'v2:warrior:0:1', 1, enemy, 10000);
  assert(p.damageMeter!.abilities['Cleaving Strike'].damage > 0);
  enemy.debuffs = [{ kind: 'bleed', ownerId: p.id, stacks: 2, nextTick: 11000, expiresAt: 12000 }];
  tickDebuffs(scene, [p], 11000);
  assert.equal(p.damageMeter!.abilities.Bleed.damage, 2);
  hitWithWeapon(scene, enemy, p, 11000, undefined, 1, undefined, true);
  assert(p.damageMeter!.abilities.Bear.damage > 0);
  const total = p.damageMeter!.total;
  enemy.hitpoints = 3;
  hitEnemy(scene, enemy, 100, p, 11000, undefined, 'physical', false, 'Overkill');
  hitEnemy(scene, enemy, 100, p, 11000);
  assert.equal(p.damageMeter!.total, total + 3);
  assert.equal(p.damageMeter!.abilities.Overkill.damage, 3);
  assert.equal(damagePerSecond(p, 11000), p.damageMeter!.total / 5);
  assert.equal(
    Object.values(p.damageMeter!.abilities).reduce((sum, entry) => {
      return sum + entry.damage;
    }, 0),
    p.damageMeter!.total,
  );
  assert.equal(damagePerSecond(p, 16000), 0);
  assert(
    Object.values(p.damageMeter!.abilities).every((entry) => {
      return entry.dps === 0;
    }),
  );
  assert.equal(p.damageMeter!.total, total + 3);
  p.classId = 'mage';
  assert.equal(damagePerSecond(p, 16001), 0);
  assert.equal(p.damageMeter, undefined);
});
