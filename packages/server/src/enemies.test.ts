import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forestTrees, forestDistance, FOREST, stepCombat, moveEnemies } from '@emberfall/core';
import type { Enemy, SceneState } from '@emberfall/common';

import { Difficulty, EnemyKind, EnemyType } from '@emberfall/common/enums';
import { player, enemy } from './enemies.fixture.ts';

test('authoritative movement scales base speed by difficulty, then roots, for every enemy type', () => {
  const speeds = { skeleton: 64, runner: 104, brute: 40, caster: 54 };
  const multipliers = { Easy: 1, Medium: 1.05, Hard: 1.15 };
  for (const difficulty of Object.values(Difficulty)) {
    for (const archetype of Object.values(EnemyKind)) {
      for (const kind of Object.values(EnemyType)) {
        for (const rooted of [false, true]) {
          const e: Enemy = {
            ...enemy(1, 2300, 1280),
            archetype,
            kind,
            debuffs: rooted
              ? [{ kind: 'roots', stacks: 1, expiresAt: 5000, nextTick: 2000, ownerId: 'p' }]
              : [],
          };
          const scene: SceneState = {
            id: 'speed',
            type: 'Forest',
            difficulty,
            phase: 'active',
            ready: [],
            countdownAt: null,
            endsAt: 1e9,
            nextSpawn: 1e9,
            sequence: 0,
            damage: [],
            portals: [],
            enemies: [e],
          };
          stepCombat(scene, [player(2700, 1280)], 1000, 0.01);
          const slow = rooted && kind !== EnemyType.Boss ? 0.9 : 1;
          const expected = speeds[archetype] * multipliers[difficulty] * slow * 0.01;
          assert.ok(
            Math.abs(forestDistance({ x: 2300, y: 1280 }, e) - expected) < 1e-8,
            `${difficulty} ${kind} ${archetype}, roots=${rooted}`,
          );
        }
      }
    }
  }
});

test('enemies detour around a trunk from both sides and keep solid bodies', async () => {
  const tree = forestTrees(400, 400, 100)[0];
  for (const id of [1, 2]) {
    const e = enemy(id, tree.x - 70, tree.y - 15);
    const target = player(tree.x + 70, tree.y - 15);
    for (let tick = 0; tick < 160; tick++) {
      moveEnemies([e], [target], 0.05);
      assert(Math.hypot(e.x - tree.x, e.y + 15 - tree.y) >= 25 - 1e-8);
    }
    assert(forestDistance(e, target) < 10, `enemy ${id} must get past the tree`);
  }
  const enemies = Array.from({ length: 16 }, (_, i) =>
    enemy(i, 2300 + (i % 4) * 24, 1200 + Math.floor(i / 4) * 24),
  );
  for (let tick = 0; tick < 120; tick++) {
    moveEnemies(enemies, [player(2400, 1280)], 0.05);
    for (const a of enemies)
      for (const b of enemies)
        if (a.id !== b.id)
          assert(forestDistance(a, b) >= 20 - 1e-8, 'crowd bodies must not overlap');
  }
});

test('chase selects nearest living player, retargets, and respects wrapped crowd collisions', async () => {
  const e = enemy(1, 2, 1280);
  const far = player(300, 1280),
    near = player(FOREST.width - 30, 1280);
  moveEnemies([e], [far, near], 0.05);
  assert(forestDistance(e, near) < 32);
  near.hitpoints = 0;
  const before = forestDistance(e, far);
  moveEnemies([e], [far, near], 0.05);
  assert(forestDistance(e, far) < before);
  const crowd = [enemy(1, 2, 1280), enemy(2, FOREST.width - 20, 1280)];
  for (let i = 0; i < 50; i++) {
    moveEnemies(crowd, [player(FOREST.width - 40, 1280)], 0.05);
    assert(forestDistance(crowd[0], crowd[1]) >= 20 - 1e-8);
  }
});
