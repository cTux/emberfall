import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARENA } from '@emberfall/core';
import { wrappedDelta } from '@emberfall/common';
import { createCritterMotion, crittersAt } from '../../client/src/critter-motion.ts';

test('ambient critters wander, stay bounded, cull and repeat across forest seams', async () => {
  const lobby = { x: 0, y: 0, width: 960, height: 640 };
  const first = crittersAt('village', 0, lobby);
  assert.equal(first.length, 6);
  assert.deepEqual(first, crittersAt('village', 12000, lobby));
  assert.notDeepEqual(first, crittersAt('village', 2000, lobby));
  for (let now = 0; now < 12000; now += 100) {
    const critters = crittersAt('village', now, lobby);
    critters.forEach((p, i) => {
      assert.ok(Math.abs(p.x - first[i].x) <= 40);
      assert.ok(Number.isInteger(p.frame) && p.frame >= 0 && p.frame <= 4);
      assert.equal(p.y, first[i].y);
    });
  }

  assert.deepEqual(crittersAt('village', 0, { x: 1000, y: 1000, width: 100, height: 100 }), []);
  const bounds = { x: 2080, y: 960, width: 960, height: 640 };
  const forest = crittersAt('forest', 2000, bounds);
  assert.ok(forest.length > 0);
  const repeated = crittersAt('forest', 2000, { ...bounds, x: bounds.x + 4800 });
  assert.equal(repeated.length, forest.length);
  repeated.forEach((p, i) => {
    assert.ok(Math.abs(p.x - 4800 - forest[i].x) < 1e-9);
    assert.deepEqual({ ...p, x: 0 }, { ...forest[i], x: 0 });
  });
});

const village = { x: 0, y: 0, width: ARENA.width, height: ARENA.height };
const chicken = (critters: ReturnType<typeof crittersAt>) =>
  critters.find((p) => p.kind === 'chicken')!;

test('chickens flee in every direction at eight times walking speed and animate faster', () => {
  for (const [dx, dy] of [
    [30, 0],
    [-30, 0],
    [0, 30],
    [0, -30],
    [30, 30],
  ]) {
    const motion = createCritterMotion();
    const start = chicken(motion(0, village, []));
    const player = { x: start.x + dx, y: start.y + dy };
    const before = motion(0, village, [player]);
    const after = motion(100, village, [player]);
    const end = chicken(after);
    const distance = Math.hypot(dx, dy);
    assert.ok(Math.abs(end.x - start.x + (dx / distance) * 8) < 1e-9);
    assert.ok(Math.abs(end.y - start.y + (dy / distance) * 8) < 1e-9);
    if (dx) assert.equal(end.left, dx > 0);
    assert.equal(chicken(motion(140, village, [player])).frame, 3);
    assert.deepEqual(
      after.filter((p) => p.kind === 'cat'),
      crittersAt('village', 100, village).filter((p) => p.kind === 'cat'),
    );
    assert.deepEqual(
      before.map(({ x, y }) => ({ x, y })),
      crittersAt('village', 0, village).map(({ x, y }) => ({ x, y })),
    );
    assert.ok(chicken(before).frame >= 1 && chicken(before).frame <= 3);
  }
});

test('chickens react to the nearest player, keep a safety margin, and return without teleporting', () => {
  const motion = createCritterMotion();
  const start = chicken(motion(0, village, []));
  const far = { x: start.x + 71, y: start.y };
  assert.deepEqual(motion(0, village, [far]), crittersAt('village', 0, village));
  const players = [
    { x: start.x - 60, y: start.y },
    { x: start.x + 30, y: start.y },
  ];
  const fled = chicken(motion(100, village, players));
  assert.equal(fled.x, start.x - 8);
  const margin = chicken(motion(200, village, [{ x: fled.x + 80, y: fled.y }]));
  assert.equal(margin.x, fled.x - 8);
  const settled = chicken(motion(300, village, []));
  assert.ok(Math.hypot(settled.x - margin.x, settled.y - margin.y) <= 1.000001);
  for (let now = 400; now <= 12000; now += 100) motion(now, village, []);
  assert.ok(
    Math.abs(
      chicken(motion(12000, village, [])).x - chicken(crittersAt('village', 12000, village)).x,
    ) < 1e-9,
  );
});

test('chicken panic wraps with the camera, survives culling, and caps hidden-tab steps', () => {
  const motion = createCritterMotion();
  const start = chicken(motion(0, village, []));
  const player = { x: start.x + ARENA.width + 30, y: start.y + ARENA.height };
  const shifted = { ...village, x: ARENA.width, y: ARENA.height };
  const end = chicken(motion(100, shifted, [player]));
  assert.ok(Math.abs(end.x - ARENA.width - start.x + 8) < 1e-9);
  assert.ok(Math.abs(end.y - ARENA.height - start.y) < 1e-9);
  motion(200, { x: 0, y: 0, width: 1, height: 1 }, [player]);
  const visible = chicken(motion(200, village, [player]));
  assert.ok(Math.abs(visible.x - start.x + 16) < 1e-9);
  const resumed = chicken(motion(100000, village, [{ x: visible.x + 20, y: visible.y }]));
  assert.ok(Math.abs(wrappedDelta(resumed.x, visible.x, ARENA.width) + 8) < 1e-9);
  const overlap = createCritterMotion();
  overlap(0, village, [start]);
  const escaped = chicken(overlap(100, village, [start]));
  assert.ok(Number.isFinite(escaped.x) && Math.abs(escaped.x - start.x) === 8);
  assert.deepEqual(createCritterMotion()(0, village, []), crittersAt('village', 0, village));
});

test('a chased chicken travels continuously across both world edges', () => {
  for (const axis of ['x', 'y'] as const) {
    const motion = createCritterMotion();
    let previous = chicken(motion(0, village, []));
    for (let now = 100; now <= 14000; now += 100) {
      const player = { x: previous.x, y: previous.y, [axis]: previous[axis] + 30 };
      const current = chicken(motion(now, village, [player]));
      const size = axis === 'x' ? ARENA.width : ARENA.height;
      assert.ok(Math.abs(wrappedDelta(current[axis], previous[axis], size) + 8) < 1e-9);
      previous = current;
    }
  }
});

test('reactive motion preserves server-time cat positions for pet interactions', () => {
  const motion = createCritterMotion();
  const cats = (critters: ReturnType<typeof crittersAt>) =>
    critters.filter((c) => c.kind === 'cat');
  assert.deepEqual(
    cats(motion(100, village, [], 1700000000000)),
    cats(crittersAt('village', 1700000000000, village)),
  );
});
