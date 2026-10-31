import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayNight, DAY_MS } from '../packages/client/src/day-night.ts';
import { shadowProjection } from '../packages/client/src/lighting.ts';

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
    // The direction resets only while both shadows are invisible at the horizon.
    for (const axis of ['x', 'y'] as const)
      assert.ok(
        Math.abs(
          before.shadow[axis] * before.shadow.opacity - after.shadow[axis] * after.shadow.opacity,
        ) < 0.001,
      );
  }
});

test('sun and weaker moon travel across the sky and change silhouette projections', () => {
  const caster = { x: 20, y: 30, height: 100 };
  for (const [start, duration, body] of [
    [0, 0.7, 'sun'],
    [0.7, 0.3, 'moon'],
  ] as const) {
    const sample = (progress: number) => dayNight((start + duration * progress) * DAY_MS);
    const morning = sample(0.15),
      noon = sample(0.5),
      evening = sample(0.85);
    assert.equal(noon.celestial, body);
    assert.ok(morning.shadow.x > 0);
    assert.ok(evening.shadow.x < 0);
    assert.ok(Math.abs(noon.shadow.x) < 1e-12);
    const early = shadowProjection(caster, undefined, 0, morning.shadow)!;
    const high = shadowProjection(caster, undefined, 0, noon.shadow)!;
    assert.ok(Math.hypot(early.x, early.y) > Math.hypot(high.x, high.y));
    assert.equal(high.opacity, body === 'sun' ? 0.26 : 0.12);
    assert.deepEqual(
      shadowProjection({ ...caster, x: 900, y: -400 }, undefined, 0, morning.shadow),
      early,
    );
    const lamp = { x: 0, y: 0, height: 200, radius: 150, strength: 1 };
    assert.deepEqual(
      shadowProjection(caster, lamp, 0, morning.shadow),
      shadowProjection(caster, lamp, 0, evening.shadow),
    );
  }
});
