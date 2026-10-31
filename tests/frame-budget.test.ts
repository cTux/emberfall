import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FrameBudget } from '../packages/client/src/frame-budget.ts';
import { GRAPHICS_PRESETS } from '../packages/client/src/graphics.ts';

test('drawing budget retains capped cadence, adaptive thresholds and settings reset', () => {
  const settings = { ...GRAPHICS_PRESETS.Balanced, frameLimit: 30 };
  let resizes = 0;
  const budget = new FrameBudget(settings, 0, () => {
    return resizes++;
  });
  assert.equal(budget.begin(10, settings), undefined);
  assert.equal(budget.begin(34, settings), 0.034);
  for (let now = 84; now < 2050; now += 50) {
    budget.begin(now, settings);
  }

  assert.equal(budget.scale, 0.9);
  assert.equal(resizes, 1);
  assert.equal(budget.begin(4000, settings), 0.1);
  budget.begin(4050, { ...settings });
  assert.equal(budget.scale, 1);
  // Adaptation runs before a changed settings object resets the scale.
  assert.equal(resizes, 3);
});

test('FPS sampling counts rendered frames and emits only after the sample interval', () => {
  const budget = new FrameBudget(GRAPHICS_PRESETS.Low, 0, () => {});
  assert.equal(budget.sample(100), undefined);
  assert.equal(budget.sample(200), undefined);
  assert.equal(budget.sample(500), 6);
  assert.equal(budget.sample(600), undefined);
  assert.equal(budget.sample(1000), 4);
});
