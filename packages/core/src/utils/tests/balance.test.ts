import assert from 'node:assert/strict';
import test from 'node:test';
import { Difficulty, EnemyKind, EnemyType } from '@emberfall/common/enums';
import {
  enemyAttributes,
  enemyMaxHealth,
  enemyTypeMultiplier,
  difficultyMultiplier,
  spawnEnemyType,
  shouldDropItem,
  itemDropCount,
} from '../../index.ts';

test('spawn type rolls elite before normal and never selects a timer-only boss', (t) => {
  for (const [roll, type] of [
    [0, EnemyType.Elite],
    [0.04999, EnemyType.Elite],
    [0.05, EnemyType.Normal],
    [0.99999, EnemyType.Normal],
  ] as const) {
    t.mock.method(Math, 'random', () => roll);
    assert.equal(spawnEnemyType(), type);
    t.mock.restoreAll();
  }
});

test('item drop chance checks each enemy type at its exact percentage boundary', (t) => {
  for (const [type, boundary] of [
    [EnemyType.Normal, 0.04],
    [EnemyType.Elite, 0.15],
    [EnemyType.Boss, 0.5],
  ] as const) {
    t.mock.method(Math, 'random', () => boundary - 0.000001);
    assert.equal(shouldDropItem(type), true);
    t.mock.method(Math, 'random', () => boundary);
    assert.equal(shouldDropItem(type), false);
    t.mock.restoreAll();
  }
});

test('item counts roll inclusive percentage ranges then guaranteed items plus a remainder', (t) => {
  for (const [type, rolls, count] of [
    [EnemyType.Normal, [0.009], 1],
    [EnemyType.Normal, [0.01], 0],
    [EnemyType.Elite, [0, 0.49], 1],
    [EnemyType.Elite, [0, 0.5], 0],
    [EnemyType.Elite, [0.99999, 0.49], 2],
    [EnemyType.Elite, [0.99999, 0.5], 1],
    [EnemyType.Boss, [0], 1],
    [EnemyType.Boss, [250.1 / 401, 0.49], 4],
    [EnemyType.Boss, [250.1 / 401, 0.5], 3],
    [EnemyType.Boss, [0.99999], 5],
  ] as const) {
    const remaining = [...rolls];
    t.mock.method(Math, 'random', () => {
      assert.ok(remaining.length, 'unexpected random roll');
      return remaining.shift()!;
    });
    assert.equal(itemDropCount(type), count);
    assert.equal(remaining.length, 0);
    t.mock.restoreAll();
  }
});

test('enemy attributes combine archetype, type and difficulty without altering base values', () => {
  assert.deepEqual(enemyAttributes(EnemyKind.Skeleton), { hitPoints: 10, damage: 3 });
  assert.deepEqual(enemyAttributes(EnemyKind.Runner), { hitPoints: 10, damage: 3 });
  assert.deepEqual(enemyAttributes(EnemyKind.Caster, EnemyType.Elite, Difficulty.Medium), {
    hitPoints: 42,
    damage: 18,
  });
  assert.deepEqual(enemyAttributes(EnemyKind.Brute, EnemyType.Boss, Difficulty.Hard), {
    hitPoints: 1200,
    damage: 360,
  });
  assert.equal(enemyTypeMultiplier(EnemyType.Elite), 3);
  assert.equal(difficultyMultiplier(Difficulty.Medium), 2);
  const attributes = enemyAttributes(EnemyKind.Brute);
  attributes.hitPoints = 0;
  assert.equal(enemyAttributes(EnemyKind.Brute).hitPoints, 30);
  assert.equal(
    enemyMaxHealth({ archetype: EnemyKind.Brute, kind: EnemyType.Boss }, Difficulty.Hard),
    1200,
  );
  assert.equal(
    enemyMaxHealth({ maxHitpoints: 777 }, Difficulty.Hard),
    777,
    'confirmed server HP takes precedence',
  );
});
