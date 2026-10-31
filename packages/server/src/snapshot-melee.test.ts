import { swordOverlapsEnemy, smoothAttackAngle, stepCombat, FOREST } from '@emberfall/core';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import type { SceneState } from '@emberfall/common';
import { hero } from './snapshots.fixture.ts';

// These geometry assertions cover ordinary hits; critical outcomes have dedicated tests.
beforeEach((t) => {
  if ('mock' in t) t.mock.method(Math, 'random', () => 0.5);
});

test('sword reaches 75 units in its forward semicircle, with unchanged damage', async () => {
  const player = { ...hero, scene: 'forest' as const, x: 2400, y: 1280 };
  const scene: SceneState = {
    id: 'range',
    type: 'Forest',
    difficulty: 'Easy',
    phase: 'active',
    ready: [],
    countdownAt: null,
    endsAt: 120000,
    nextSpawn: 1e9,
    sequence: 0,
    damage: [],
    portals: [],
    enemies: [
      { id: 1, x: 2470, y: 1280, hitpoints: 10, angle: 0 },
      { id: 2, x: 2475, y: 1280, hitpoints: 10, angle: 0 },
      { id: 3, x: 2500, y: 1280, hitpoints: 10, angle: 0 },
      { id: 4, x: 2325, y: 1280, hitpoints: 10, angle: 0 },
    ],
  };
  stepCombat(scene, [player], 10000, 0);
  assert.deepEqual(
    scene.enemies.map((e) => e.hitpoints),
    [5, 5, 10, 10],
  );
});

test('sword body overlap includes arc and diameter edges, and wraps across the forest seam', async () => {
  const p = { ...hero, scene: 'forest' as const, x: 2400, y: 1280, attackAngle: 0 };
  const enemy = { id: 1, x: p.x + 99, y: p.y + 6, hitpoints: 10, angle: 0 };
  assert(swordOverlapsEnemy(p, enemy));
  enemy.x += 1;
  assert(!swordOverlapsEnemy(p, enemy));
  enemy.x = p.x - 24;
  enemy.y = p.y + 46;
  assert(swordOverlapsEnemy(p, enemy));
  enemy.x = p.x - 24.01;
  assert(!swordOverlapsEnemy(p, enemy));
  p.x = FOREST.width - 5;
  enemy.x = 20;
  enemy.y = p.y;
  assert(swordOverlapsEnemy(p, enemy));
});

test('every enemy overlapping during a swing is hit once, including late entrants and retargets', async () => {
  const player = { ...hero, scene: 'forest' as const, x: 2400, y: 1280 };
  const scene: SceneState = {
    id: 'sweep',
    type: 'Forest',
    difficulty: 'Easy',
    phase: 'active',
    ready: [],
    countdownAt: null,
    endsAt: 120000,
    nextSpawn: 1e9,
    sequence: 100,
    damage: [],
    portals: [],
    enemies: [
      { id: 1, x: 2440, y: 1280, hitpoints: 50, angle: 0 },
      { id: 2, x: 2498, y: 1280, hitpoints: 50, angle: 0 },
      { id: 3, x: 2540, y: 1280, hitpoints: 50, angle: 0 },
    ],
  };
  stepCombat(scene, [player], 10000, 0);
  assert.deepEqual(
    scene.enemies.map((e) => e.hitpoints),
    [45, 45, 50],
  );
  scene.enemies[2].x = 2380;
  stepCombat(scene, [player], 10100, 0.1);
  assert(player.attackAngle! > Math.PI / 2 && player.attackAngle! < Math.PI);
  assert.deepEqual(
    scene.enemies.map((e) => e.hitpoints),
    [45, 45, 45],
  );
  scene.enemies[2].x = 2540;
  stepCombat(scene, [player], 10200, 0.1);
  assert.deepEqual(
    scene.enemies.map((e) => e.hitpoints),
    [45, 45, 45],
  );
  scene.enemies.push({ id: 4, x: 2460, y: 1280, hitpoints: 50, angle: 0 });
  stepCombat(scene, [player], 10300, 0);
  assert.equal(scene.enemies[3].hitpoints, 50, 'no hits after the active window');
  for (const enemy of scene.enemies) enemy.debuffs = undefined;
  stepCombat(scene, [player], 11000, 0);
  assert.deepEqual(
    scene.enemies.map((e) => e.hitpoints),
    [40, 40, 45, 45],
  );
});

test('attack rotation takes the short path and is consistent at server and display frame rates', async () => {
  const degrees = Math.PI / 180;
  const angle = smoothAttackAngle(179 * degrees, -179 * degrees, 0.016);
  assert(angle > 179 * degrees && angle < Math.PI);
  const rotate = (steps: number) => {
    let value = 0;
    for (let i = 0; i < steps; i++) value = smoothAttackAngle(value, Math.PI / 2, 0.3 / steps);
    return value;
  };
  assert(Math.abs(rotate(6) - rotate(18)) < 1e-10);
  assert.equal(smoothAttackAngle(undefined, 1.2, 0), 1.2);
  assert.equal(smoothAttackAngle(0.5, 1.2, 0), 0.5);
});
