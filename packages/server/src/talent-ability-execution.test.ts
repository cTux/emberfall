import assert from 'node:assert/strict';
import test from 'node:test';

import {
  talentNodeId,
  availableTalentPoints,
  learnTalent,
  equipTalent,
  castTalentAbility,
  resetTalents,
  TRAINING_ZONES,
} from '@emberfall/core';

import {
  talentAilmentChance,
  talentIncomingDamage,
  tickTalentEffects,
} from '../../core/src/talent-effects.ts';

import { hero, arena, ability, cast } from './talents.fixture.ts';

test('abilities require learning and equipment, keep cooldown across slot changes, reject invalid authority', () => {
  const player = hero(),
    scene = arena();
  assert.equal(cast(player, scene), false);
  assert.throws(() => equipTalent(player, 0, talentNodeId('warrior', 0, 1)));
  ability(player, 0, 1);
  assert.equal(cast(player, scene), true);
  assert(scene.enemies[0].hitpoints < 1000);
  equipTalent(player, 1, player.talentSlots![0]);
  assert.equal(
    castTalentAbility(
      scene,
      player,
      { slot: 1, classId: 'warrior', epoch: scene.id, aimX: 1050, aimY: 1000 },
      1001,
    ),
    false,
  );
  assert.equal(cast(player, scene, 1001), false);
  player.hitpoints = 0;
  assert.equal(cast(player, scene, 20000), false);
  player.hitpoints = 100;
  scene.pausedAt = 1000;
  assert.equal(cast(player, scene, 20000), false);
  scene.pausedAt = undefined;
  assert.equal(
    castTalentAbility(
      scene,
      player,
      { slot: 0, classId: 'mage', epoch: scene.id, aimX: 0, aimY: 0 },
      20000,
    ),
    false,
  );
  assert.equal(
    castTalentAbility(
      scene,
      player,
      { slot: 0, classId: 'warrior', epoch: scene.id, aimX: NaN, aimY: 0 },
      20000,
    ),
    false,
  );
});

test('all twelve ability entries execute for every class and both ranks without non-finite damage', () => {
  for (const classId of ['warrior', 'ranger', 'mage', 'druid'])
    for (let column = 0; column < 3; column++)
      for (const row of [1, 3, 5, 7])
        for (const learned of [1, 2]) {
          const player = hero(classId),
            scene = arena();
          player.bear = {
            id: 'bear',
            name: 'Bear',
            x: 1000,
            y: 1000,
            hitpoints: 100,
            maxHitpoints: 100,
            returning: false,
          };
          ability(player, column, row, learned);
          assert.equal(cast(player, scene), true, `${classId}:${column}:${row}:${learned}`);
          for (let now = 1000; now <= 7000; now += 500) tickTalentEffects(scene, [player], now);
          assert(scene.damage.every((event) => Number.isFinite(event.amount) && event.amount >= 0));
        }
});

test('Open Wounds adds percentage points to existing bleed chance', () => {
  const player = hero();
  assert.equal(talentAilmentChance(player, 'bleed'), 0);
  learnTalent(player, talentNodeId('warrior', 1, 0));
  assert.equal(talentAilmentChance(player, 'bleed'), 0.2);
  learnTalent(player, talentNodeId('warrior', 1, 0));
  assert.equal(talentAilmentChance(player, 'bleed'), 0.35);
  assert.equal(talentAilmentChance(player, 'poison'), 0);
});

test('shield wall reduces incoming damage; resetting cancels scheduled attacks', () => {
  const player = hero(),
    scene = arena();
  ability(player, 2, 7, 2);
  assert(cast(player, scene));
  assert.equal(talentIncomingDamage(scene, player, 100, 1001), 25);
  assert.equal(talentIncomingDamage(scene, player, 100, 5000), 100);
  player.talents = {};
  player.talentSlots = [];
  ability(player, 0, 3);
  assert(cast(player, scene, 20000));
  player.coins = 50;
  resetTalents(player);
  tickTalentEffects(scene, [player], 25000);
  assert.equal(scene.damage.length, 0);
  assert.equal(availableTalentPoints(player), 20);
  assert.equal(player.coins, 0);
});

test('training casts require the training zone and never award XP or drops', () => {
  const player = hero(),
    scene = arena();
  scene.training = true;
  player.scene = undefined;
  ability(player, 0, 1);
  assert.equal(cast(player, scene), false);
  player.x = TRAINING_ZONES[0].x;
  player.y = TRAINING_ZONES[0].y;
  scene.enemies[0].x = player.x;
  scene.enemies[0].y = player.y;
  scene.enemies[0].hitpoints = 1;
  assert.equal(
    castTalentAbility(
      scene,
      player,
      { slot: 0, classId: 'warrior', epoch: 'lobby', aimX: player.x, aimY: player.y },
      1000,
    ),
    true,
  );
  assert.equal(scene.drops, undefined);
});
