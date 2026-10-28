import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayNight, DAY_MS } from '../packages/client/src/day-night.ts';

test('one-hour cycle repeats across days and retains readable blue nights', () => {
  for (const time of [0, 180000, 360000, 2160000, 2340000, 2520000, 3599999]) {
    assert.deepEqual(dayNight(time), dayNight(time + DAY_MS));
  }
  assert.equal(dayNight(360000).tint, 0xffffff);
  assert.equal(dayNight(2160000).daylight, 1);
  const night = dayNight(2520000);
  assert.equal(night.daylight, 0);
  assert.ok((night.tint & 255) > night.tint >> 16);
  assert.ok(night.tint >> 16 >= 120);
  assert.ok(night.lightAlpha > dayNight(360000).lightAlpha);
  assert.deepEqual(dayNight(-1), dayNight(DAY_MS - 1));
});

test('phase boundaries and the midnight seam are continuous', () => {
  for (const time of [0, 180000, 360000, 2160000, 2340000, 2520000, DAY_MS]) {
    const before = dayNight(time - 1),
      after = dayNight(time + 1);
    assert.ok(Math.abs(before.daylight - after.daylight) < 0.001);
    for (const shift of [0, 8, 16])
      assert.ok(Math.abs(((before.tint >> shift) & 255) - ((after.tint >> shift) & 255)) <= 1);
  }
});
