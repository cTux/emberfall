import { edgeArrow } from '../../client/src/navigation.ts';
import { randomSource, stepCombat, FOREST } from '@emberfall/core';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SnapshotBuffer } from '../../client/src/snapshots.ts';
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

test('edge indicators stay inset, point toward offscreen targets, and hide onscreen', async () => {
  assert.equal(edgeArrow(300, 200, 800, 600), null);
  assert.deepEqual(edgeArrow(1200, 300, 800, 600), { x: 772, y: 300, angle: 0 });
  const corner = edgeArrow(-900, -1200, 800, 600)!;
  assert(corner.x >= 28 && corner.y >= 28);
  assert(corner.angle < -Math.PI / 2);
});

test('fatal hits retain each enemy appearance for its death animation', async () => {
  for (const archetype of ['skeleton', 'runner', 'brute', 'caster'] as const) {
    const scene: SceneState = {
      id: archetype,
      type: 'Forest',
      difficulty: 'Easy',
      phase: 'active',
      ready: [],
      countdownAt: null,
      endsAt: 120000,
      sequence: 0,
      nextSpawn: 1e9,
      damage: [],
      portals: [],
      enemies: [{ id: 1, archetype, kind: 'elite', x: 2440, y: 1280, hitpoints: 5, angle: 1 }],
    };
    stepCombat(scene, [{ ...hero, scene: 'forest', x: 2400, y: 1280 }], 10000, 0);
    assert.equal(scene.enemies.length, 0);
    assert.deepEqual(scene.damage[0].enemy, { archetype, kind: 'elite', angle: 1 });
  }
});

test('moving loot interpolates across the seam without mutating server snapshots', async () => {
  const first = snapshot(10000, 10);
  first.players[0].scene = 'forest';
  first.scene = {
    id: 'drops',
    type: 'Forest',
    difficulty: 'Easy',
    phase: 'ended',
    ready: [],
    countdownAt: null,
    endsAt: 0,
    enemies: [],
    damage: [],
    portals: [],
    sequence: 0,
    nextSpawn: 0,
    drops: [{ id: 1, kind: 'gold', x: FOREST.width - 10, y: 500, at: 0 }],
  };
  const second = structuredClone(first);
  second.serverNow = 10100;
  second.scene!.drops![0].x = 10;
  const buffer = new SnapshotBuffer('p');
  buffer.push(first, 0);
  buffer.push(second, 100);
  const x = buffer.render(150)!.scene!.drops![0].x;
  assert(x < 10 || x > FOREST.width - 10, 'interpolation takes the short path');
  assert.equal(first.scene.drops![0].x, FOREST.width - 10);
});
