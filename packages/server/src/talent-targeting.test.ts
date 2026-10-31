import assert from 'node:assert/strict';
import test from 'node:test';

import {
  talentNodeId,
  learnTalent,
  castTalentAbility,
  resetTalents,
  TRAINING_ZONES,
  FOREST,
  tickCompanion,
  companionStats,
} from '@emberfall/core';
import { modelHitbox } from '../../core/src/hitboxes.ts';

import { hero, arena, ability } from './talents.fixture.ts';

test('learned Pack Howl boosts Bear size, claw reach and health at either rank until reset', () => {
  for (const training of [false, true]) {
    for (const learned of [1, 2]) {
      const player = hero('druid'),
        scene = arena();
      player.scene = training ? undefined : 'forest';
      scene.training = training;
      tickCompanion(player, scene, 10000, 0);
      const bear = player.bear!;
      const baseHealth = player.maxHitpoints * 1.5;
      assert.equal(bear.maxHitpoints, baseHealth);
      bear.hitpoints = baseHealth - 20;
      assert.equal(bear.size, 48);
      assert.equal(companionStats(player).range, 75);
      for (let i = 0; i < learned; i++) {
        learnTalent(player, talentNodeId('druid', 1, 3));
      }

      // No cast or action-bar assignment is needed; test the wrapped outer edge.
      player.x = bear.x = FOREST.width - 40;
      scene.enemies = [{ id: 1, x: 72, y: bear.y + 6, angle: 0, hitpoints: 1000 }];
      tickCompanion(player, scene, 11000, 0);
      assert.equal(bear.size, 96);
      assert.equal(bear.maxHitpoints, baseHealth * 1.3);
      assert.equal(bear.hitpoints, baseHealth * 1.3 - 20);
      assert.equal(bear.range, 97.5);
      assert.equal(companionStats(player).manualRange, 97.5);
      assert.equal(modelHitbox(bear).radius, 48);
      assert(scene.enemies[0].hitpoints < 1000, 'claws hit beyond the base 75-unit reach');
      bear.hitpoints = 0;
      bear.resurrectAt = 12000;
      tickCompanion(player, scene, 12000, 0);
      assert.equal(bear.maxHitpoints, baseHealth * 1.3);
      assert.equal(bear.hitpoints, baseHealth * 1.3);
      assert.equal(bear.size, 96);
      assert.equal(bear.range, 97.5);
      player.coins = 50;
      resetTalents(player);
      scene.enemies[0].hitpoints = 1000;
      tickCompanion(player, scene, 13000, 0);
      assert.equal(bear.maxHitpoints, baseHealth);
      assert.equal(bear.hitpoints, baseHealth);
      assert.equal(bear.size, 48);
      assert.equal(bear.range, 75);
      assert.equal(modelHitbox(bear).radius, 24);
      assert.equal(scene.enemies[0].hitpoints, 1000, 'reset removes the extended claw reach');
    }
  }
});

test('talent auto-target selects a living enemy in range across seams and preserves manual aim', () => {
  for (const training of [false, true]) {
    for (const autoTarget of [false, true]) {
      const player = hero('mage'),
        scene = arena();
      player.autoTarget = autoTarget;
      player.x = training ? TRAINING_ZONES[0].x : 10;
      player.y = training ? TRAINING_ZONES[0].y : 1000;
      if (training) {
        player.scene = undefined;
      }

      scene.training = training;
      ability(player, 0, 1);
      const target = {
        ...scene.enemies[0],
        x: training ? player.x + 200 : FOREST.width - 190,
        y: player.y,
      };
      scene.enemies = [
        { ...target, id: 2, x: player.x, hitpoints: 0 },
        target,
        { ...target, id: 3, x: player.x + 701 },
      ];
      assert.equal(
        castTalentAbility(
          scene,
          player,
          {
            slot: 0,
            classId: 'mage',
            epoch: training ? 'lobby' : scene.id,
            aimX: player.x + 500,
            aimY: player.y,
          },
          1000,
        ),
        true,
      );
      assert.equal(target.hitpoints < 1000, autoTarget);
      assert.equal(scene.enemies[2].hitpoints, 1000);
    }
  }
});

test('talent auto-target falls back to cursor aim when no living enemy is in range', () => {
  const player = hero('mage'),
    scene = arena();
  player.autoTarget = true;
  ability(player, 0, 1);
  const target = scene.enemies[0];
  target.x = player.x + 701;
  assert.equal(
    castTalentAbility(
      scene,
      player,
      {
        slot: 0,
        classId: 'mage',
        epoch: scene.id,
        aimX: player.x - 500,
        aimY: player.y,
      },
      1000,
    ),
    true,
  );
  assert.equal(target.hitpoints, 1000);
});
