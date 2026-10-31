import assert from 'node:assert/strict';
import test from 'node:test';
import { isChanced, isMultiChanced, itemDropCount, spawnEnemyType } from '../../index.ts';
import { EnemyType } from '@emberfall/common/enums';

test('injected probability sources retain guaranteed outcomes and range draw order', () => {
  const values = [0.5, 0.004, 0.049, 0.05];
  const random = () => {
    assert(values.length, 'unexpected random draw');

    return values.shift()!;
  };

  assert.equal(isChanced(0, random), false);
  assert.equal(isChanced(100, random), true);
  assert.equal(isMultiChanced(300, random), 3);
  // Elite's 50..150 inclusive range rolls 100%, with no remainder draw.
  assert.equal(itemDropCount(EnemyType.Elite, random), 1);
  assert.equal(itemDropCount(EnemyType.Normal, random), 1);
  assert.equal(spawnEnemyType(random), EnemyType.Elite);
  assert.equal(spawnEnemyType(random), EnemyType.Normal);
  assert.deepEqual(values, []);
});
