import {
  createGame,
  baseMod,
  companionStats,
  tickCompanion,
  defaultSpellRange,
  stepCombat,
  swordOverlapsEnemy,
  tickDebuffs,
} from '@emberfall/core';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { enemyHitbox } from '../../core/src/hitboxes.ts';
import type { GearDefinition } from '@emberfall/common';

import { hero, target, scene } from './equipment.fixture.ts';

test('Warrior and Bear use 75-unit melee geometry, including wrapped model boundaries', () => {
  const player = hero();
  const ranges = [defaultSpellRange(player), companionStats(hero('druid')).range];
  for (const range of ranges) {
    assert.equal(range, 75);
    for (const wrapped of [false, true]) {
      const actor = { x: wrapped ? 4790 : 2400, y: 1280, attackAngle: 0 };
      const enemy = target();
      enemy.y += actor.y - enemyHitbox(enemy).y;
      enemy.x = (actor.x + range + enemyHitbox(enemy).radius) % 4800;
      assert.equal(swordOverlapsEnemy(actor, enemy, range), true);
      enemy.x += 0.01;
      assert.equal(swordOverlapsEnemy(actor, enemy, range), false);
    }
  }
});

test('Bear inherits gear stats with physical damage, fixed range, health and bleed overrides', (t) => {
  const gear: GearDefinition = {
    id: 'bear-test-ring',
    name: 'Test ring',
    gearType: 'ring',
    stats: { power: 10, attacksPerSecond: 1, armor: 100, maxHitpoints: 20 },
  };
  const context = createGame([
    baseMod,
    {
      id: 'bear-fixture',
      register(r) {
        r.items.register({ ...gear, kind: 'gear' });
      },
    },
  ]);
  const { characterStats, companionStats, syncEquipmentVitals } = context.rules;
  t.mock.method(Math, 'random', () => {
    return 0.5;
  });
  for (const training of [true, false]) {
    const player = hero('druid');
    player.equipment!.ring = gear.id;
    player.autoAttack = false;
    if (!training) {
      player.scene = 'forest';
    }

    syncEquipmentVitals(player);
    const stats = companionStats(player);
    assert.deepEqual(stats, {
      ...characterStats(player),
      damageType: 'physical',
      range: 75,
      manualRange: 75,
      maxHitpoints: 180,
    });
    const arena = scene(training);
    // A target whose model overlaps the 75-unit claw range.
    arena.enemies[0].x = player.x + 80;
    tickCompanion(player, arena, 1000, 0, context);
    assert.equal(player.bear!.maxHitpoints, 180);
    assert.equal(arena.damage[0].amount, 13);
    assert.equal(arena.damage[0].damageType, 'physical');
    assert.equal(arena.damage[0].ownerId, player.id);
    tickCompanion(player, arena, 1259, 0, context);
    assert.equal(arena.damage.length, 1, 'no duplicate hit during a swing');
    tickCompanion(player, arena, 1499, 0, context);
    assert.equal(arena.damage.length, 1);
    tickCompanion(player, arena, 1500, 0, context);
    assert.equal(arena.damage.length, 2, 'inherits the 500ms gear cadence');
    if (!training) {
      arena.enemies[0].x = player.x - 100;
      player.bear!.x = player.x - 100;
      arena.enemies[0].attack = {
        startedAt: 1500,
        endsAt: 2000,
        x: player.bear!.x,
        y: player.bear!.y,
        radius: 30,
        ranged: false,
      };
      stepCombat(arena, [player], 2000, 0, context);
      assert.equal(player.bear!.hitpoints, 178.5, 'owner armor halves incoming damage');
    }

    player.equipment = {};
    tickCompanion(player, arena, 3000, 0, context);
    assert.equal(player.bear!.attackAt, undefined);
  }
});

test('Bear critical and 10% bleed boundaries work in forest and training across a seam', (t) => {
  for (const training of [true, false]) {
    for (const roll of [0, 0.049999, 0.05, 0.099999, 0.1]) {
      const random = t.mock.method(Math, 'random', () => {
        return roll;
      });
      const player = hero('druid');
      if (!training) {
        player.scene = 'forest';
      }

      player.x = 5;
      const arena = scene(training);
      arena.enemies[0].x = 4800 - 65;
      tickCompanion(player, arena, 1000, 0);
      assert.equal(arena.damage[0].critical, roll < 0.05);
      assert.equal(arena.damage[0].amount, roll < 0.05 ? 4.5 : 3);
      assert.equal(arena.damage[0].damageType, 'physical');
      assert.equal(arena.enemies[0].debuffs?.length ?? 0, roll < 0.1 ? 1 : 0);
      if (roll < 0.1) {
        assert.equal(arena.enemies[0].debuffs![0].kind, 'bleed');
        tickDebuffs(arena, [player], 2000);
        assert.equal(arena.damage.at(-1)!.amount, 1);
        assert.equal(arena.damage.at(-1)!.ownerId, player.id);
      }

      random.mock.restore();
    }
  }
});
