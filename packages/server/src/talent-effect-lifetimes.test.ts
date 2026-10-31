import assert from 'node:assert/strict';
import test from 'node:test';

import { talentNodeId, learnTalent } from '@emberfall/core';

import { talentIncomingDamage, tickTalentEffects } from '../../core/src/talent-effects.ts';

import { hero, arena, ability, cast } from './talents.fixture.ts';

test('Rupture consumes only its owner wounds and spreads only at rank two', () => {
  const player = hero(),
    scene = arena();
  ability(player, 1, 5, 2);
  const target = scene.enemies[0];
  target.debuffs = [
    { kind: 'bleed', ownerId: player.id, stacks: 3, nextTick: 2000, expiresAt: 6000 },
    { kind: 'bleed', ownerId: 'teammate', stacks: 2, nextTick: 2000, expiresAt: 6000 },
  ];
  scene.enemies.push({ id: 2, x: 1100, y: 1000, hitpoints: 1000, angle: 0 });
  assert(cast(player, scene));
  assert.equal(target.hitpoints, 970);
  assert.equal(scene.enemies[1].hitpoints, 985);
  assert.equal(target.debuffs.length, 1);
  assert.equal(target.debuffs[0].ownerId, 'teammate');
});

test('Rupture includes DOT Speed in the remaining wound damage', () => {
  const player = hero(),
    scene = arena();
  ability(player, 1, 5, 2);
  const target = scene.enemies[0];
  target.debuffs = [
    {
      kind: 'bleed',
      ownerId: player.id,
      stacks: 3,
      nextTick: 1500,
      tickIntervalMs: 500,
      expiresAt: 6000,
    },
  ];
  assert(cast(player, scene));
  assert.equal(target.hitpoints, 940);
  assert.equal(target.debuffs.length, 0);
});

test('Second Impact repeats once, and clearing a reset invalidates queued effects even after relearning', async (t) => {
  t.mock.method(Math, 'random', () => 0);
  const { clearTalentEffects } = await import('@emberfall/core');
  const player = hero(),
    scene = arena();
  ability(player, 0, 1);
  learnTalent(player, talentNodeId('warrior', 0, 2));
  assert(cast(player, scene));
  assert.equal(scene.damage.length, 1);
  tickTalentEffects(scene, [player], 1300);
  assert.equal(scene.damage.length, 2);
  tickTalentEffects(scene, [player], 100000);
  assert.equal(scene.damage.length, 2);
  player.talentCooldowns = {};
  assert(cast(player, scene, 200000));
  clearTalentEffects(player);
  tickTalentEffects(scene, [player], 200300);
  assert.equal(scene.damage.length, 3);
});

test('defensive shelter protects nearby teammates without stacking barriers, and healing never revives dead players', () => {
  const player = hero(),
    ally = { ...hero(), id: 'ally' },
    scene = arena();
  ability(player, 2, 3, 2);
  assert(cast(player, scene));
  tickTalentEffects(scene, [player, ally], 1000);
  const protectedDamage = talentIncomingDamage(scene, ally, 50, 1001);
  assert.equal(protectedDamage, 50 - player.maxHitpoints * 0.1);
  const druid = hero('druid');
  ability(druid, 2, 3, 2);
  ally.hitpoints = 0;
  assert(cast(druid, scene));
  tickTalentEffects(scene, [player, druid, ally], 1000);
  assert.equal(ally.hitpoints, 0);
});

test('minimum incoming damage triggers Rebirth before a fractional-HP lethal hit', () => {
  const player = hero('druid');
  const scene = arena();
  learnTalent(player, talentNodeId('druid', 2, 9));
  player.hitpoints = 0.8;
  assert.equal(talentIncomingDamage(scene, player, 0.2, 1000), 0);
  assert.equal(talentIncomingDamage(scene, player, 0.2, 1001), 1);
});
