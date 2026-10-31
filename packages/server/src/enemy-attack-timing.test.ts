import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FOREST } from '@emberfall/core';
import { stepCombat } from '@emberfall/core';
import type { SceneState } from '@emberfall/common';

import { player, enemy } from './enemies.fixture.ts';

test('melee windup can be dodged and ranged attacks launch visible, colliding projectiles', async () => {
  const p = player(2400, 1280);
  const scene: SceneState = {
    id: 's',
    type: 'Forest',
    difficulty: 'Easy',
    phase: 'active',
    ready: [],
    countdownAt: null,
    endsAt: 1e9,
    nextSpawn: 1e9,
    sequence: 0,
    damage: [],
    portals: [],
    enemies: [enemy(1, 2430, 1280)],
  };
  stepCombat(scene, [p], 10000, 0);
  assert(scene.enemies[0].attack);
  stepCombat(scene, [p], 10649, 0);
  assert.equal(p.hitpoints, 100);
  p.x = 2300;
  stepCombat(scene, [p], 10650, 0);
  assert.equal(p.hitpoints, 100);
  assert.equal(scene.enemies[0].attack, undefined);
  const x = scene.enemies[0].x;
  stepCombat(scene, [p], 10700, 0.05);
  assert(scene.enemies[0].x < x);
  scene.enemies = [{ ...enemy(2, 2400, 1280), archetype: 'caster' }];
  p.x = 2520;
  stepCombat(scene, [p], 12000, 0);
  assert(scene.enemies[0].attack?.ranged);
  stepCombat(scene, [p], 12899, 0);
  assert.equal(scene.projectiles!.length, 0);
  stepCombat(scene, [p], 12900, 0);
  assert.equal(scene.projectiles!.length, 1);
  p.y = 1350;
  for (let i = 1; i <= 12; i++) stepCombat(scene, [p], 12900 + i * 50, 0.05);
  assert.equal(p.hitpoints, 100);
  p.y = 1280;
  scene.projectiles = [{ id: 99, x: p.x - 20, y: p.y, vx: 210, vy: 0, expiresAt: 20000 }];
  stepCombat(scene, [p], 14000, 0.1);
  assert.equal(p.hitpoints, 97);
  assert.equal(scene.projectiles.length, 0);
});

test('enemy projectiles overlap the whole player model, including wrapped boundaries', () => {
  for (const wrapped of [false, true]) {
    for (const gap of [16, 28.9, 29.1]) {
      const p = player(wrapped ? 2 : 2400, 1280);
      const scene: SceneState = {
        id: 'hitbox',
        type: 'Forest',
        difficulty: 'Easy',
        phase: 'active',
        ready: [],
        countdownAt: null,
        endsAt: 1e9,
        nextSpawn: 1e9,
        sequence: 0,
        damage: [],
        portals: [],
        enemies: [],
        projectiles: [
          {
            id: 1,
            x: wrapped ? FOREST.width + 2 - gap : p.x - gap,
            y: p.y - 6,
            vx: 0,
            vy: 0,
            expiresAt: 20000,
          },
        ],
      };
      stepCombat(scene, [p], 10000, 0);
      assert.equal(p.hitpoints, gap < 29 ? 97 : 100);
      assert.equal(scene.projectiles!.length, gap < 29 ? 0 : 1);
    }
  }
});
