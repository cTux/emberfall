import assert from 'node:assert/strict';
import test from 'node:test';
import { recoveryCooldownMs } from '../recoveryCooldownMs.ts';

test('recovery rate divides base cooldown and supports reductions without negative timers', () => {
  for (const [rate, expected] of [
    [0, 6000],
    [0.25, 4800],
    [0.5, 4000],
    [1, 3000],
    [-0.5, 12000],
    [-1, Infinity],
    [-1.5, Infinity],
  ])
    assert.equal(recoveryCooldownMs(6000, rate!), expected);
});
