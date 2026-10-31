import assert from 'node:assert/strict';
import test from 'node:test';
import { Difficulty, EnemyKind, EnemyType } from '../packages/common/src/enums/index.ts';
import {
  difficultyAttributesMultiplier,
  difficultySpeedMultiplier,
  enemyKindAttribute,
  enemyTypeAttributesMultiplier,
  isMultiChanced,
  spawnEnemyType,
  itemCountDropPercent,
  itemDropChance,
} from '../packages/core/src/index.ts';

test('ordered spawn chances select elite first and fall back to normal', (t) => {
  for (const [roll, expected] of [
    [0.049, EnemyType.Elite],
    [0.05, EnemyType.Normal],
  ] as const) {
    t.mock.method(Math, 'random', () => roll);
    assert.equal(spawnEnemyType(), expected);
    t.mock.restoreAll();
  }
});

test('drop counts support 350 percent as three guaranteed items and a chance of a fourth', (t) => {
  assert.ok((itemCountDropPercent[EnemyType.Boss] as { min: number; max: number }).min <= 350);
  assert.ok((itemCountDropPercent[EnemyType.Boss] as { min: number; max: number }).max >= 350);
  t.mock.method(Math, 'random', () => 0.499);
  assert.equal(isMultiChanced(350), 4);
  t.mock.method(Math, 'random', () => 0.5);
  assert.equal(isMultiChanced(350), 3);
});

test('balance tables cover every shared enum value with valid attributes and percentages', () => {
  for (const type of Object.values(EnemyType)) {
    assert.ok(itemDropChance[type] >= 0 && itemDropChance[type] <= 100);
    assert.ok(enemyTypeAttributesMultiplier[type] > 0);
    const count = itemCountDropPercent[type];
    if (typeof count === 'number') assert.ok(count >= 0);
    else assert.ok(count.min >= 0 && count.max >= count.min);
  }

  for (const kind of Object.values(EnemyKind)) {
    assert.ok(enemyKindAttribute[kind].hitPoints > 0);
    assert.ok(enemyKindAttribute[kind].damage > 0);
    assert.ok(enemyKindAttribute[kind].speed > 0);
  }

  for (const difficulty of Object.values(Difficulty)) {
    assert.ok(difficultyAttributesMultiplier[difficulty] > 0);
    assert.ok(difficultySpeedMultiplier[difficulty] > 0);
  }
});
