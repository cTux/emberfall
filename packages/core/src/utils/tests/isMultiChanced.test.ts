import assert from 'node:assert/strict';
import test from 'node:test';
import { isMultiChanced } from '../../index.ts';

test('isMultiChanced rolls for the remainder after guaranteed events', (t) => {
  for (const [roll, expected] of [
    [0.499, 2],
    [0.5, 1],
  ]) {
    t.mock.method(Math, 'random', () => roll);
    assert.equal(isMultiChanced(150), expected);
    assert.equal(isMultiChanced(250), expected + 1);
    assert.equal(isMultiChanced(50), expected - 1);
    t.mock.restoreAll();
  }
});

test('isMultiChanced supports fractional percentages below one percent', (t) => {
  t.mock.method(Math, 'random', () => 0.000009);
  assert.equal(isMultiChanced(0.001), 1);
  t.mock.method(Math, 'random', () => 0.000011);
  assert.equal(isMultiChanced(0.001), 0);
});

test('isMultiChanced handles guaranteed counts and non-finite inputs', (t) => {
  const random = t.mock.method(Math, 'random', () => 0.5);
  for (const percent of [-Infinity, -1, 0, NaN]) {
    assert.equal(isMultiChanced(percent), 0);
  }

  assert.equal(isMultiChanced(100), 1);
  assert.equal(isMultiChanced(200), 2);
  assert.equal(random.mock.callCount(), 0);
  assert.equal(isMultiChanced(Infinity), Infinity);
});
