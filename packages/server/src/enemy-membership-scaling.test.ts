import { test } from 'node:test';
import assert from 'node:assert/strict';

import { randomSource, stepCombat, enemyMaxHealth, hitEnemy } from '@emberfall/core';
import type { Player, SceneState } from '@emberfall/common';
import { CharacterStore } from './characters.ts';

import { player, enemy } from './enemies.fixture.ts';

test('scene population compounds enemy HP and dropped XP, preserving fractions in saves', async (t) => {
  t.mock.method(randomSource, 'next', () => {
    return 0.5;
  });

  for (const count of [1, 2, 3, 8]) {
    for (const kind of ['normal', 'elite', 'boss'] as const) {
      t.mock.method(randomSource, 'next', () => {
        return kind === 'elite' ? 0.04 : 0.5;
      });
      const players = Array.from({ length: count }, (_, i) => {
        return {
          ...player(2400, 1280),
          id: `p${i}`,
        };
      });

      // Dead scene members count; village members and companions do not.
      if (count > 1) {
        players[count - 1].hitpoints = 0;
      }

      const lobby = { ...player(2400, 1280), id: 'lobby', scene: undefined };
      const scene: SceneState = {
        id: 'scaling',
        type: 'Forest',
        difficulty: 'Easy',
        phase: 'active',
        ready: [],
        countdownAt: null,
        endsAt: kind === 'boss' ? 10000 : 1e9,
        nextSpawn: 0,
        spawnCount: kind === 'elite' ? 9 : 0,
        sequence: 0,
        damage: [],
        portals: [],
        enemies: [],
      };
      stepCombat(scene, [...players, lobby], 10000, 0);
      const spawn = scene.spawns![0];
      assert.equal(spawn.kind, kind);
      const base = enemyMaxHealth({ kind, archetype: spawn.archetype });
      assert.equal(spawn.hitpoints, base * 1.75 ** (count - 1));
      assert.equal(spawn.maxHitpoints, spawn.hitpoints);
      scene.nextSpawn = 1e9;
      stepCombat(scene, [...players, lobby], 11000, 0);
      const target = scene.enemies[0];
      target.hitpoints /= 2;
      const newcomer = { ...player(2400, 1280), id: 'new' };
      stepCombat(scene, [...players, lobby, newcomer], 11050, 0);
      assert.equal(target.maxHitpoints, base * 1.75 ** count);
      assert.equal(target.hitpoints, target.maxHitpoints / 2);
      stepCombat(scene, [...players, lobby], 11100, 0);
      assert.equal(target.maxHitpoints, base * 1.75 ** (count - 1));
      assert.equal(target.hitpoints, target.maxHitpoints / 2);
      hitEnemy(scene, target, target.hitpoints, players[0], 11200);
      const drop = scene.drops![0];
      assert.equal(drop.amount, 1.2 ** (count - 1));
      drop.x = players[0].x;
      drop.y = players[0].y;
      // Amount is fixed at death, even if another player arrives before collection.
      stepCombat(scene, [...players, lobby, newcomer], 11600, 0);
      assert.equal(players[0].experience, 1 + 1.2 ** (count - 1));
      assert.equal(newcomer.experience, 1.2 ** (count - 1));
      assert.equal(lobby.experience, 0);

      if (count > 1) {
        assert.equal(players[count - 1].experience, 0);
      }

      assert.equal(
        scene.drops!.filter((drop) => {
          return drop.kind === 'experience';
        }).length,
        0,
      );
      const store = new CharacterStore(':memory:');
      await store.ready;
      try {
        const saved = store.create('scaling');
        store.save(saved.id, 'scaling', players[0]);
        assert.equal(store.load(saved.token).progress.experience, players[0].experience);
      } finally {
        store.close();
      }
    }
  }
});

test('reconnecting players and their companions cannot be targeted or hit', () => {
  const offline: Player = { ...player(2400, 1280), reconnecting: true, autoAttack: true };
  offline.bear = {
    id: 'bear',
    name: 'Bear',
    x: offline.x,
    y: offline.y,
    hitpoints: 100,
    maxHitpoints: 100,
    returning: false,
  };
  const online = { ...player(2460, 1280), id: 'online', autoAttack: false };
  const foe = enemy(1, 2400, 1280);
  const scene: SceneState = {
    id: 'reconnect',
    type: 'Forest',
    difficulty: 'Easy',
    phase: 'active',
    ready: [],
    countdownAt: null,
    endsAt: 1e9,
    nextSpawn: 1e9,
    sequence: 10,
    damage: [],
    portals: [],
    enemies: [foe],
    projectiles: [{ id: 9, x: offline.x, y: offline.y, vx: 0, vy: 0, expiresAt: 20000 }],
  };
  stepCombat(scene, [offline, online], 10000, 0);
  assert.equal(foe.attack, undefined, 'nearby reconnecting player does not trigger a melee attack');
  assert.equal(offline.hitpoints, 100);
  assert.equal(offline.bear.hitpoints, 100);
  assert.equal(scene.projectiles?.length, 1, 'projectile passes through reconnecting combatants');
  assert.equal(scene.playerShots?.length ?? 0, 0, 'reconnecting player cannot auto-attack');
  online.x = offline.x + 20;
  foe.attack = {
    startedAt: 9000,
    endsAt: 10000,
    x: offline.x,
    y: offline.y,
    radius: 100,
    ranged: false,
  };
  stepCombat(scene, [offline, online], 10050, 0);
  assert.equal(offline.hitpoints, 100, 'existing area attacks cannot hit reconnecting player');
  assert.equal(offline.bear.hitpoints, 100);
  assert(online.hitpoints < 100, 'connected player still takes area damage');
  delete offline.reconnecting;
  scene.projectiles = [{ id: 11, x: offline.x, y: offline.y, vx: 0, vy: 0, expiresAt: 20000 }];
  stepCombat(scene, [offline, online], 10100, 0);
  assert(offline.hitpoints < 100, 'resuming restores projectile collisions');
});
