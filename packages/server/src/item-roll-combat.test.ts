import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Enemy } from '@emberfall/common';
import {
  ItemStat,
  characterStats,
  game,
  movePlayer,
  hitWithWeapon,
  tickPlayerShots,
  fireClassAttack,
  effectiveAbility,
  talentAbility,
  FOREST,
} from '@emberfall/core';

import { hero, equip, arena } from './item-rolls.fixture.ts';

test('movement, range and melee area bonuses affect actual shared movement and targeting', (t) => {
  t.mock.method(Math, 'random', () => {
    return 0.5;
  });
  const player = hero();
  equip(player, 'boots', 'loot-boots', ItemStat.MovementSpeed);
  const plain = hero();
  movePlayer(plain, 1, 0, 0.1);
  movePlayer(player, 1, 0, 0.1);
  assert(Math.abs((player.x - 2400) / (plain.x - 2400) - 1.06) < 1e-10);
  const mage = hero('mage');
  equip(mage, 'weapon', 'mage-staff', ItemStat.Range);
  const scene = arena();
  fireClassAttack(scene, mage);
  assert.equal(scene.playerShots![0].remaining, 1200);
  assert.equal(characterStats(mage).range, 300);
  assert.equal(
    effectiveAbility(mage, game.registries.abilities.require('fireball')).manualRange,
    1200,
  );
});

test('legendary weapon and off-hand effects stack; extra warrior attacks independently crit and trigger on-hit effects', (t) => {
  const player = hero();
  equip(player, 'weapon', 'warrior-sword', ItemStat.AdditionalAttack);
  equip(player, 'offHand', 'loot-shield', ItemStat.AdditionalAttack);
  const scene = arena();
  const enemy: Enemy = { id: 1, x: 2420, y: 1280, hitpoints: 1000, angle: 0 };
  const rolls = [0, 0.5, 0.5, 0, 0.5, 0.5];
  t.mock.method(Math, 'random', () => {
    return rolls.shift() ?? 0.5;
  });
  hitWithWeapon(scene, enemy, player, 1000, 'bleed');
  assert.equal(scene.damage.length, 3);
  assert(
    scene.damage.some((hit) => {
      return hit.critical;
    }),
  );
  assert(
    scene.damage.some((hit) => {
      return !hit.critical;
    }),
  );
  assert.equal(enemy.debuffs?.length, 1);
});

test('hunter base arrows stop after four hits; two legendary pierce bonuses allow six across the seam', (t) => {
  t.mock.method(Math, 'random', () => {
    return 0.5;
  });

  for (const bonus of [false, true]) {
    const player = hero('ranger');
    player.x = FOREST.width - 100;

    if (bonus) {
      equip(player, 'weapon', 'ranger-bow', ItemStat.ProjectilePierce);
      equip(player, 'offHand', 'loot-quiver', ItemStat.ProjectilePierce);
    }

    const scene = arena(false);
    scene.enemies = Array.from({ length: 7 }, (_, index) => {
      return {
        id: index + 1,
        x: (player.x + 40 + index * 45) % FOREST.width,
        y: player.y + 12,
        hitpoints: 100,
        angle: 0,
      };
    });
    scene.playerShots = [
      {
        id: 1,
        ownerId: player.id,
        kind: 'arrow',
        x: player.x,
        y: player.y,
        angle: 0,
        remaining: 1000,
        hitIds: [],
      },
    ];
    tickPlayerShots(scene, [player], 1000, 1);
    assert.equal(scene.damage.length, bonus ? 6 : 4);
    assert.equal(scene.playerShots.length, 0);
  }
});

test('mage projectile counts, splash radii and druid bounce limits consume their equipped configs', () => {
  const mage = hero('mage');
  equip(mage, 'weapon', 'mage-staff', ItemStat.MoreProjectiles);
  equip(mage, 'offHand', 'loot-orb', ItemStat.MoreProjectiles);
  equip(mage, 'amulet', 'loot-amulet', ItemStat.AreaOfEffect);
  const scene = arena();
  fireClassAttack(scene, mage);
  assert.equal(scene.playerShots!.length, 4);
  assert.equal(
    effectiveAbility(mage, game.registries.abilities.require('fireball')).splashRadius,
    120,
  );
  const druid = hero('druid');
  equip(druid, 'weapon', 'druid-staff', ItemStat.ProjectilesBounce);
  equip(druid, 'offHand', 'loot-natureFocus', ItemStat.ProjectilesBounce);
  assert.equal(effectiveAbility(druid, game.registries.abilities.require('roots')).bounces, 5);
  assert.equal(effectiveAbility(druid, talentAbility(druid, 1)!).bounces, 5);
});
