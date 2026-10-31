import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  FOREST,
  forestDistance,
  stepCombat,
  tickDebuffs,
  fireClassAttack,
  tickPlayerShots,
  moveEnemies,
} from '@emberfall/core';

import { hero, enemy, scene } from './classes.fixture.ts';

// Base-damage scenarios exclude random criticals; equipment-damage.test.ts covers their boundaries.
beforeEach((t) => {
  if ('mock' in t) {
    t.mock.method(Math, 'random', () => {
      return 0.5;
    });
  }
});

test('one root projectile bounces three times at full power without repeating targets', () => {
  for (const training of [false, true]) {
    const s = scene(),
      p = { ...hero(), classId: 'druid' as const };

    if (training) {
      s.training = true;
      delete p.scene;
    }

    s.enemies = [
      enemy(1, 2420),
      enemy(2, 2480),
      enemy(3, 2540),
      enemy(4, 2600),
      enemy(5, 2660),
      enemy(6, 2425, 0),
    ];
    fireClassAttack(s, p, 10000);
    assert.equal(s.playerShots!.length, 1);
    const shot = s.playerShots![0];
    tickPlayerShots(s, [p], 10050, 0.05);

    for (let i = 1; i < 4; i++) {
      assert.equal(s.playerShots![0], shot, 'retain the same projectile through every bounce');
      assert.equal(shot.targetId, i + 1);
      tickPlayerShots(s, [p], 10050 + i * 200, 0.2);
    }

    assert.deepEqual(shot.hitIds, [1, 2, 3, 4]);
    assert.deepEqual(
      s.enemies.map((e) => {
        return e.hitpoints;
      }),
      [97, 97, 97, 97, 100, 0],
    );
    assert.equal(s.playerShots!.length, 0);
    fireClassAttack(s, p, 10700);
    tickPlayerShots(s, [p], 10750, 0.05);
    const target = s.enemies[0];
    assert.equal(target.hitpoints, 94);
    assert.equal(target.debuffs![0].stacks, 1);
    assert.equal(target.debuffs![0].expiresAt, 15750);
    tickDebuffs(s, [p], 15749);
    assert.equal(target.hitpoints, 94);
    tickDebuffs(s, [p], 15750);
    assert.equal(target.debuffs!.length, 0);

    if (training) {
      assert.equal(p.experience, 0);
      assert.equal(s.drops?.length ?? 0, 0);
    }
  }
});

test('root bounce radius includes 250 units and excludes targets just beyond it', () => {
  for (const distance of [250, 250.01]) {
    const s = scene(),
      p = { ...hero(), classId: 'druid' as const };
    s.enemies = [enemy(1, 2420), enemy(2, 2420 + distance)];
    fireClassAttack(s, p, 1000);
    tickPlayerShots(s, [p], 1050, 0.05);
    assert.equal(s.playerShots!.length, distance === 250 ? 1 : 0);

    for (let i = 0; i < 20; i++) {
      tickPlayerShots(s, [p], 1100 + i * 50, 0.05);
    }

    assert.equal(s.enemies[1].hitpoints, distance === 250 ? 97 : 100);
    assert.equal(s.enemies[0].hitpoints, 97);
    assert.equal(s.playerShots!.length, 0);
  }
});

test('root slow reduces ordinary speed by exactly ten percent and expires at its deadline', () => {
  for (const kind of ['normal', 'boss'] as const) {
    const plain = { ...enemy(1), kind },
      rooted = {
        ...enemy(1),
        kind,
        debuffs: [
          { kind: 'roots' as const, stacks: 1, expiresAt: 5000, nextTick: 1000, ownerId: 'p' },
        ],
      };
    const p = hero();
    moveEnemies([plain], [p], 0.01, 4999);
    moveEnemies([rooted], [p], 0.01, 4999);
    assert(
      Math.abs(
        forestDistance(rooted, enemy(1)) / forestDistance(plain, enemy(1)) -
          (kind === 'boss' ? 1 : 0.9),
      ) < 1e-9,
    );
    const expired = { ...enemy(1), kind, debuffs: rooted.debuffs };
    moveEnemies([expired], [p], 0.01, 5000);
    assert.deepEqual({ x: expired.x, y: expired.y }, { x: plain.x, y: plain.y });
  }
});

test('root bounce selects across seams, excludes dead targets, and stops when its target dies', () => {
  const s = scene(),
    p = { ...hero(), classId: 'druid' as const, x: 20 };
  s.enemies = [enemy(1, 30), enemy(2, FOREST.width - 20), enemy(3, 130), enemy(4, 32, 0)];
  fireClassAttack(s, p, 1000);
  tickPlayerShots(s, [p], 1050, 0.05);
  assert(
    s.playerShots!.every((shot) => {
      return shot.targetId === 2;
    }),
  );
  tickPlayerShots(s, [p], 1250, 0.2);
  assert.equal(s.enemies[1].hitpoints, 97);
  assert.equal(s.enemies[2].hitpoints, 100);
  assert.equal(s.playerShots!.length, 1);
  s.playerShots = [];
  fireClassAttack(s, p, 2000);
  tickPlayerShots(s, [p], 2050, 0.05);
  s.enemies[1].hitpoints = 0;
  tickPlayerShots(s, [p], 2250, 0.2);
  assert.equal(s.playerShots.length, 0);
  assert.equal(s.enemies[2].hitpoints, 100);
});

test('roots damage a lone enemy only once per projectile and never bounce back', () => {
  const s = scene(),
    p = { ...hero(), classId: 'druid' as const };
  s.enemies = [enemy(1, 2420)];
  fireClassAttack(s, p, 1000);
  tickPlayerShots(s, [p], 1050, 0.05);
  tickPlayerShots(s, [p], 1250, 1);
  assert.equal(s.enemies[0].hitpoints, 97);
  assert.equal(s.playerShots!.length, 0);
});

test('roots slow ordinary enemies, bosses are immune, and root kills complete the boss', async () => {
  const s = scene(),
    p = { ...hero(), classId: 'druid' as const, attackAt: 10000 };
  const normal = enemy(1),
    boss = { ...enemy(2, 2300), kind: 'boss' as const };
  s.enemies = [normal, boss];
  s.bossId = boss.id;
  fireClassAttack(s, p, 10000);
  tickPlayerShots(s, [p], 10100, 0.2);
  fireClassAttack(s, { ...p, x: boss.x }, 10100);
  tickPlayerShots(s, [p], 10100, 0);
  assert.equal(boss.debuffs?.length ?? 0, 0);
  moveEnemies([normal], [p], 0.1, 10100);
  assert(normal.x < 2480);
  moveEnemies([boss], [p], 0.1, 10100);
  assert(boss.x > 2300);
  boss.hitpoints = 2;
  fireClassAttack(s, { ...p, x: boss.x }, 10200);
  tickPlayerShots(s, [p], 10200, 0);
  p.x = 2000;
  stepCombat(s, [p], 11000, 0);
  assert.equal(s.phase, 'ended');
  assert.equal(p.experience, 1);
  assert(s.drops?.length);
});

test('root primary and bounce both use full critical weapon damage', (t) => {
  t.mock.method(Math, 'random', () => {
    return 0;
  });
  const s = scene(),
    p = { ...hero(), classId: 'druid' as const };
  s.enemies = [enemy(1, 2420), enemy(2, 2480)];
  fireClassAttack(s, p, 1000);
  tickPlayerShots(s, [p], 1050, 0.05);
  tickPlayerShots(s, [p], 1250, 0.2);
  assert.deepEqual(
    s.enemies.map((e) => {
      return e.hitpoints;
    }),
    [95.5, 95.5],
  );
  assert(
    s.damage.every((hit) => {
      return hit.amount === 4.5 && hit.critical && hit.damageType === 'nature';
    }),
  );
});

test('a lethal root impact still bounces and credits both kills through the shared path', () => {
  const s = scene(),
    p = { ...hero(), classId: 'druid' as const };
  s.enemies = [enemy(1, 2420, 3), enemy(2, 2480, 3)];
  fireClassAttack(s, p, 1000);
  tickPlayerShots(s, [p], 1050, 0.05);
  tickPlayerShots(s, [p], 1250, 0.2);
  assert(
    s.enemies.every((e) => {
      return e.hitpoints === 0;
    }),
  );
  tickPlayerShots(s, [p], 2300, 1);
  assert.equal(p.experience, 2);
  assert.equal(
    s.drops!.filter((drop) => {
      return drop.kind === 'experience';
    }).length,
    2,
  );
  assert.equal(s.playerShots!.length, 0);
});
