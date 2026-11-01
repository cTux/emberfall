import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SnapshotBuffer } from '../../client/src/snapshots.ts';
import { randomSource, FOREST } from '@emberfall/core';
import type { SceneState } from '@emberfall/common';
import { hero, snapshot } from './snapshots.fixture.ts';

// These geometry assertions cover ordinary hits; critical outcomes have dedicated tests.
beforeEach((t) => {
  if ('mock' in t) {
    t.mock.method(randomSource, 'next', () => {
      return 0.5;
    });
  }
});

test('remote lobby players interpolate across seams instead of crossing the whole map', async () => {
  for (const axis of ['x', 'y'] as const) {
    const size = axis === 'x' ? FOREST.width : FOREST.height;
    const buffer = new SnapshotBuffer('p');
    buffer.push({ ...snapshot(10000, 420), players: [{ ...hero, [axis]: size - 4 }] }, 0);
    buffer.render(0);
    buffer.push({ ...snapshot(10200, 420), players: [{ ...hero, [axis]: 4 }] }, 200);
    const point = buffer.render(200)!.players[0][axis];
    assert(point < 4 || point > size - 4);
  }
});

test('confirmed movement interpolates, never extrapolates, and holds through packet gaps', async () => {
  const buffer = new SnapshotBuffer('p');
  const base = snapshot(10000, 420);
  buffer.push(base, 0);
  assert.equal(buffer.render(0)!.players[0].x, 420);

  for (let i = 1; i <= 4; i++) {
    buffer.push(snapshot(10000 + i * 50, 420 + i * 9), i * 50);
    buffer.render(i * 50);
  }

  const middle = buffer.render(225)!;
  assert(middle.players[0].x > 438 && middle.players[0].x < 447);
  assert.equal(buffer.render(2000)!.players[0].x, 456);
  assert.equal(buffer.render(3000)!.players[0].x, 456);
  assert.equal(buffer.render(3000)!.players[0].inputX, 0);
  assert.equal(base.players[0].x, 420);
  buffer.push(snapshot(10050, 100), 3100);
  assert.equal(buffer.render(3100)!.players[0].x, 456, 'stale packets must not rewind playback');
});

test('Bear animation follows confirmed movement, stops during packet gaps, and snaps teleports', async () => {
  const buffer = new SnapshotBuffer('p');
  const base = snapshot(10000, 420);
  base.players[0].bear = {
    id: 'bear:p',
    name: 'Bear',
    x: 420,
    y: 340,
    hitpoints: 150,
    maxHitpoints: 150,
    returning: false,
    moving: true,
  };
  buffer.push(base, 0);
  assert.equal(buffer.render(0)!.players[0].bear!.moving, false);

  for (let i = 1; i <= 4; i++) {
    const next = structuredClone(base);
    next.serverNow = 10000 + i * 50;
    next.players[0].bear!.x += i * 9;
    buffer.push(next, i * 50);
    buffer.render(i * 50);
  }

  assert.equal(buffer.render(225)!.players[0].bear!.moving, true);
  assert.equal(buffer.render(2000)!.players[0].bear!.moving, false);
  const teleported = structuredClone(base);
  teleported.serverNow = 10250;
  teleported.players[0].bear!.x = 800;
  buffer.push(teleported, 2050);
  const bear = buffer.render(2075)!.players[0].bear!;
  assert.equal(bear.x, 800);
  assert.equal(bear.moving, false);
  assert.equal(base.players[0].bear.x, 420);
});

test('snapshot playback wraps edges, snaps area transfers, and does not predict damage', async () => {
  const buffer = new SnapshotBuffer('p');
  const forest = snapshot(10000, FOREST.width - 4);
  forest.players[0].scene = 'forest';
  forest.players[0].y = 1280;
  forest.scene = { id: 'run', enemies: [], phase: 'active' } as unknown as SceneState;
  buffer.push(forest, 0);
  buffer.render(0);
  const next = structuredClone(forest);
  next.serverNow = 10050;
  next.players[0].x = 5;
  buffer.push(next, 50);
  buffer.render(50);
  const halfway = buffer.render(125)!;
  assert(halfway.players[0].x < 10 || halfway.players[0].x > FOREST.width - 10);
  assert.equal(halfway.players[0].hitpoints, 100);
  buffer.push(snapshot(10100, 480), 150);
  assert.equal(buffer.render(150)!.players[0].x, 480);
});

test('snapshot age includes interpolation and packet gaps without depending on server clock', async () => {
  const buffer = new SnapshotBuffer('p');
  assert.equal(buffer.age(0), null);
  buffer.push(snapshot(1_000_000, 420), 0);
  assert.equal(buffer.age(0), 100);
  buffer.render(250);
  assert.equal(buffer.age(250), 250);
  buffer.push(snapshot(1_000_300, 420), 300);
  assert.equal(buffer.age(300), 300);
});
