import assert from 'node:assert/strict';
import test from 'node:test';
import type { Player } from '@emberfall/common';
import { TRAINING_ZONES, FOREST } from '@emberfall/core';

import { talentIncomingDamage } from '../../core/src/talent-effects.ts';

import { hero, arena, ability, cast } from './talents.fixture.ts';

test('Mending Seed and Renewal heal the lowest HP percentage in range, including wrapped party members', () => {
  for (const training of [false, true]) {
    for (const row of [1, 7]) {
      for (const learned of [1, 2]) {
        const player = hero('druid'),
          scene = arena();
        scene.training = training;
        player.partyId = 'party';
        player.hitpoints = 80;
        player.maxHitpoints = 100;
        player.x = training ? TRAINING_ZONES[0].x : 10;
        player.y = training ? TRAINING_ZONES[0].y : 1000;

        if (training) {
          player.scene = undefined;
        }

        const ally = {
          ...player,
          id: 'ally',
          x: training ? player.x + 700 : FOREST.width - 690,
          hitpoints: 200,
          maxHitpoints: 1000,
        };
        const lessInjured = { ...player, id: 'less', hitpoints: 30 };
        const outside = { ...player, id: 'outside', x: player.x + 701, hitpoints: 1 };
        const stranger = { ...player, id: 'stranger', partyId: undefined, hitpoints: 1 };
        const otherArea: Player = {
          ...player,
          id: 'area',
          scene: training ? 'forest' : undefined,
          hitpoints: 1,
        };
        const otherRun = { ...player, id: 'run', runId: 'other', hitpoints: 1 };
        const dead = { ...player, id: 'dead', hitpoints: 0 };
        const disconnected = { ...player, id: 'disconnected', hitpoints: 1, reconnecting: true };
        const full = { ...player, id: 'full', hitpoints: 100 };
        ability(player, 2, row, learned);
        const players = [
          player,
          lessInjured,
          outside,
          stranger,
          otherArea,
          otherRun,
          dead,
          disconnected,
          full,
          ally,
        ];
        assert(cast(player, scene, 1000, players));
        const fraction = row === 1 ? (learned === 2 ? 0.2 : 0.12) : learned === 2 ? 0.35 : 0.2;
        assert.equal(ally.hitpoints, 200 + 1000 * fraction);
        assert.equal(player.hitpoints, 80);
        assert.equal(lessInjured.hitpoints, 30);

        for (const excluded of [outside, stranger, otherArea, otherRun, disconnected]) {
          assert.equal(excluded.hitpoints, 1);
        }

        assert.equal(dead.hitpoints, 0);
        assert.equal(full.hitpoints, 100);
        assert.equal(scene.explosions?.[0].x, ally.x);
        assert.equal(scene.explosions?.[0].ownerId, player.id);

        if (row === 7) {
          assert.equal(talentIncomingDamage(scene, player, 100, 1001), learned === 2 ? 25 : 40);
        }
      }
    }
  }
});

test('targeted healing handles solo, full health, ties and overhealing', () => {
  const player = hero('druid'),
    scene = arena();
  player.maxHitpoints = 100;
  player.hitpoints = 99;
  ability(player, 2, 1, 2);
  assert(cast(player, scene));
  assert.equal(player.hitpoints, 100);
  assert(cast(player, scene, 10000));
  assert.equal(player.hitpoints, 100);
  player.partyId = 'party';
  player.hitpoints = 50;
  const ally = { ...player, id: 'ally' };
  assert(cast(player, scene, 20000, [player, ally]));
  assert.equal(player.hitpoints, 70);
  assert.equal(ally.hitpoints, 50);
});

test('direct heals select own and party Bears by health percentage in forest and training', () => {
  for (const training of [false, true]) {
    for (const row of [1, 7]) {
      for (const ownBear of [false, true]) {
        const player = hero('druid'),
          scene = arena();
        scene.training = training;

        if (training) {
          player.scene = undefined;
        }

        player.partyId = 'party';
        player.x = training ? TRAINING_ZONES[0].x : 10;
        player.y = training ? TRAINING_ZONES[0].y : 1000;
        player.hitpoints = 50;
        player.maxHitpoints = 100;
        const ally = { ...player, id: 'ally', hitpoints: 100 };
        const owner = ownBear ? player : ally;
        owner.bear = {
          id: 'bear',
          name: 'Bear',
          x: training ? player.x + 20 : FOREST.width - 10,
          y: player.y,
          hitpoints: 30,
          maxHitpoints: 150,
          returning: false,
        };
        ability(player, 2, row, 2);
        assert(cast(player, scene, 1000, [player, ally]));
        assert.equal(owner.bear.hitpoints, 30 + 150 * (row === 1 ? 0.2 : 0.35));
        assert.equal(player.hitpoints, 50);
        assert.equal(scene.explosions?.[0].x, owner.bear.x);
      }
    }
  }
});

test('healing excludes dead, full, distant and ineligible owners Bears', () => {
  for (const excluded of ['dead', 'full', 'distant', 'party', 'area', 'run', 'disconnected']) {
    const player = hero('druid'),
      scene = arena();
    player.partyId = 'party';
    player.hitpoints = player.maxHitpoints;
    const ally = { ...player, id: 'ally' };
    ally.bear = {
      id: 'bear',
      name: 'Bear',
      x: player.x,
      y: player.y,
      hitpoints: 1,
      maxHitpoints: 150,
      returning: false,
    };

    if (excluded === 'dead') {
      ally.bear.hitpoints = 0;
    }

    if (excluded === 'full') {
      ally.bear.hitpoints = 150;
    }

    if (excluded === 'distant') {
      ally.bear.x += 701;
    }

    if (excluded === 'party') {
      ally.partyId = 'other';
    }

    if (excluded === 'area') {
      ally.scene = undefined;
    }

    if (excluded === 'run') {
      ally.runId = 'other';
    }

    if (excluded === 'disconnected') {
      ally.reconnecting = true;
    }

    const before = ally.bear.hitpoints;
    ability(player, 2, 1);
    assert(cast(player, scene, 1000, [player, ally]));
    assert.equal(ally.bear.hitpoints, before, excluded);
  }
});
