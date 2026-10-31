import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  FOREST,
  stepCombat,
  tickCompanion,
  fireClassAttack,
  tickPlayerShots,
  projectileAngle,
} from '@emberfall/core';
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

test('projectile spread centers odd and even counts with six-degree spacing', async () => {
  for (const [count, degrees] of [
    [1, [0]],
    [2, [-3, 3]],
    [3, [-6, 0, 6]],
    [4, [-9, -3, 3, 9]],
    [5, [-12, -6, 0, 6, 12]],
  ] as const) {
    for (const [index, offset] of degrees.entries()) {
      assert(
        Math.abs(projectileAngle(1.2, index, count) - (1.2 + (offset * Math.PI) / 180)) < 1e-12,
      );
    }
  }
});

test('ranged classes launch their configured straight projectiles in both aiming modes', async () => {
  const { advancePlayerShot } = await import('@emberfall/core');

  for (const classId of ['mage', 'ranger', 'druid'] as const) {
    for (const autoTarget of [false, true]) {
      const p = { ...hero(), classId, autoTarget, aimX: 2600, aimY: 1280 };
      const s = scene();
      s.enemies = [enemy(1)];
      fireClassAttack(s, p, 1000);
      assert.equal(s.playerShots!.length, classId === 'druid' ? 1 : 2);
      assert.deepEqual(
        s.playerShots!.map((shot) => {
          return shot.angle;
        }),
        classId === 'druid' ? [0] : [-Math.PI / 60, Math.PI / 60],
      );
      s.enemies[0].y += 100;

      for (const shot of s.playerShots!) {
        const angle = shot.angle;
        advancePlayerShot(shot, s.enemies, 0.05);
        assert.equal(shot.angle, angle);
      }
    }
  }
});

test('Druid launches roots without instant melee damage, with zero or one target', async () => {
  const s = scene(),
    p: Player = { ...hero(), classId: 'druid' };
  tickCompanion(p, s, 10000, 0);
  p.bear!.hitpoints = 0;
  p.bear!.resurrectAt = 20000;
  s.enemies = [enemy(1, 2440)];
  stepCombat(s, [p], 10000, 0);
  assert.equal(s.enemies[0].hitpoints, 100);
  assert.equal(s.enemies[0].debuffs, undefined);
  assert.equal(s.playerShots!.length, 1);
  tickPlayerShots(s, [p], 10100, 0.1);
  assert.equal(s.enemies[0].hitpoints, 97);
  assert.equal(s.enemies[0].debuffs![0].expiresAt, 15100);
  s.enemies = [];
  assert.doesNotThrow(() => {
    return fireClassAttack(s, p, 10700);
  });
});

test('ranger arrows hit each of the first four targets once, wrap, and expire at 1000 units', (t) => {
  t.mock.method(Math, 'random', () => {
    return 0.5;
  });
  const s = scene(),
    p = { ...hero(), classId: 'ranger' as const, x: FOREST.width - 60 };
  s.enemies = [enemy(1, FOREST.width - 20, 10), enemy(2, 30, 10), enemy(3, 960, 10)];
  fireClassAttack(s, p);
  assert.equal(s.playerShots!.length, 2);

  for (let i = 1; i <= 40; i++) {
    tickPlayerShots(s, [p], i * 50, 0.05);
  }

  assert.deepEqual(
    s.enemies.map((e) => {
      return e.hitpoints;
    }),
    [0, 0, 10],
  );
  assert.equal(s.playerShots!.length, 0);
});

test('mage fireballs target and travel up to 250 units, including wrapped edges', async () => {
  const s = scene(),
    p = { ...hero(), classId: 'mage' as const };
  s.enemies = [enemy(1, p.x + 250), enemy(2, p.x + 250.01), enemy(3, p.x + 249)];
  fireClassAttack(s, p);
  assert.deepEqual(
    s.playerShots!.map((shot) => {
      return shot.targetId;
    }),
    [3, 3],
  );
  assert(
    s.playerShots!.every((shot) => {
      return shot.remaining === 250;
    }),
  );
  s.enemies.forEach((e) => {
    e.x = p.x + 500;
  });
  tickPlayerShots(s, [p], 1000, 1);
  assert.equal(s.playerShots!.length, 0);
  assert(
    s.enemies.every((e) => {
      return e.hitpoints === 100;
    }),
  );
  p.x = 5;
  s.enemies = [enemy(4, FOREST.width - 245), enemy(5, FOREST.width - 245.01)];
  fireClassAttack(s, p);
  assert.deepEqual(
    s.playerShots!.map((shot) => {
      return shot.targetId;
    }),
    [4, 4],
  );
  s.playerShots = [];
  fireClassAttack(s, { ...p, classId: 'ranger' });
  assert.equal(s.playerShots[0].remaining, 1000);
});

test('mage aims at the nearest target; each impact deals three direct and one splash damage', (t) => {
  t.mock.method(Math, 'random', () => {
    return 0.5;
  });
  const s = scene(),
    p = { ...hero(), classId: 'mage' as const };
  s.enemies = [enemy(1, 2480), enemy(2, 2510), enemy(3, 2650)];
  fireClassAttack(s, p);
  assert.deepEqual(
    s.playerShots!.map((shot) => {
      return shot.targetId;
    }),
    [1, 1],
  );

  for (let i = 1; i <= 10; i++) {
    tickPlayerShots(s, [p], i * 50, 0.05);
  }

  assert.deepEqual(
    s.enemies.map((e) => {
      return e.hitpoints;
    }),
    [94, 98, 100],
  );
  assert.equal(s.playerShots!.length, 0);
  s.enemies = [enemy(4)];
  fireClassAttack(s, p);
  assert.equal(s.playerShots!.length, 2);
});

test('fireball damages the actual collision target only once and splashes across wrapped edges', (t) => {
  t.mock.method(Math, 'random', () => {
    return 0.5;
  });
  const s = scene(),
    p = { ...hero(), classId: 'mage' as const, x: 5 };
  const direct = enemy(1, FOREST.width - 5);
  s.enemies = [direct, enemy(2, 119), enemy(3, 119.01), enemy(4, FOREST.width - 200)];

  for (const target of s.enemies) {
    target.y += 6;
  } // Model centers align with the explosion.

  fireClassAttack(s, p, 1000);
  s.playerShots!.splice(1);
  s.playerShots![0].x = direct.x;
  s.playerShots![0].targetId = 4;
  tickPlayerShots(s, [p], 1000, 0);
  assert.deepEqual(
    s.enemies.map((e) => {
      return e.hitpoints;
    }),
    [97, 99, 100, 100],
  );
  assert.deepEqual(
    s.damage.map((hit) => {
      return hit.amount;
    }),
    [3, 1],
  );
  assert.equal(s.explosions!.length, 1);
  assert.equal(s.explosions![0].ownerId, p.id);
});

test('class attacks fire once per cycle and ranged classes never deal a melee slash', (t) => {
  t.mock.method(Math, 'random', () => {
    return 0.5;
  });

  for (const classId of ['ranger', 'mage'] as const) {
    const s = scene(),
      p = { ...hero(), classId };
    s.enemies = [enemy(1, 2440)];
    stepCombat(s, [p], 10000, 0);
    assert.equal(s.enemies[0].hitpoints, 100);
    assert.equal(s.playerShots!.length, 2);
    const ids = s.playerShots!.map((shot) => {
      return shot.id;
    });
    stepCombat(s, [p], 10050, 0);
    assert.deepEqual(
      s.playerShots!.map((shot) => {
        return shot.id;
      }),
      ids,
    );
    stepCombat(s, [p], 10999, 0);
    assert.equal(s.playerShots!.length, 2);
    stepCombat(s, [p], 11000, 0);
    assert.equal(s.playerShots!.length, 4);
  }
});
