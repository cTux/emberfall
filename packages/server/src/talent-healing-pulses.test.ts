import assert from 'node:assert/strict';
import test from 'node:test';

import { talentNodeId, learnTalent } from '@emberfall/core';

import { tickTalentEffects } from '../../core/src/talent-effects.ts';

import { hero, arena, ability, cast } from './talents.fixture.ts';

test('grove pulses reselect Bears and stop healing after their owner leaves', () => {
  const player = hero('druid'),
    scene = arena();
  player.partyId = 'party';
  player.maxHitpoints = 100;
  player.hitpoints = 100;
  const ally = { ...player, id: 'ally' };
  ally.bear = {
    id: 'bear',
    name: 'Bear',
    x: player.x + 200,
    y: player.y,
    hitpoints: 10,
    maxHitpoints: 150,
    returning: false,
  };
  ability(player, 2, 3, 2);
  assert(cast(player, scene));
  tickTalentEffects(scene, [player, ally], 1000);
  assert.equal(ally.bear.hitpoints, 16);
  player.hitpoints = 1;
  tickTalentEffects(scene, [player, ally], 2000);
  assert.equal(player.hitpoints, 5);
  player.hitpoints = 100;
  tickTalentEffects(scene, [player], 3000);
  assert.equal(ally.bear.hitpoints, 16);
});

test('Healing Grove reselects one injured party member per pulse within its fixed radius', () => {
  const player = hero('druid'),
    scene = arena();
  player.partyId = 'party';
  player.maxHitpoints = 100;
  player.hitpoints = 100;
  const first = { ...player, id: 'first', hitpoints: 10, x: player.x + 200 };
  const second = { ...player, id: 'second', hitpoints: 11 };
  const outside = { ...player, id: 'outside', hitpoints: 1, x: player.x + 201 };
  const stranger = { ...player, id: 'stranger', hitpoints: 1, partyId: undefined };
  ability(player, 2, 3, 2);
  assert(cast(player, scene));
  tickTalentEffects(scene, [player, second, outside, stranger, first], 1000);
  assert.equal(first.hitpoints, 14);
  assert.equal(second.hitpoints, 11);
  player.x += 500;
  tickTalentEffects(scene, [player, second, first], 2000);
  assert.equal(second.hitpoints, 15);
  first.partyId = 'left';
  tickTalentEffects(scene, [player, second, first], 3000);
  assert.equal(first.hitpoints, 14);
  assert.equal(second.hitpoints, 19);
  assert.equal(outside.hitpoints, 1);
  assert.equal(stranger.hitpoints, 1);
});

test('healing opportunities choose the most injured nearby party member and are consumed once', () => {
  const player = hero(),
    scene = arena();
  player.partyId = 'party';
  player.maxHitpoints = 100;
  player.hitpoints = 80;
  ability(player, 1, 5);
  learnTalent(player, talentNodeId('warrior', 1, 8));
  scene.enemies[0].debuffs = [
    { kind: 'bleed', ownerId: player.id, stacks: 3, nextTick: 2000, expiresAt: 6000 },
  ];
  const ally = { ...player, id: 'ally', x: 1110, hitpoints: 10 };
  const stranger = { ...ally, id: 'stranger', partyId: undefined, hitpoints: 1 };
  ally.bear = {
    id: 'bear',
    name: 'Bear',
    x: 1050,
    y: 1000,
    hitpoints: 1,
    maxHitpoints: 150,
    returning: false,
  };
  assert(cast(player, scene));
  tickTalentEffects(scene, [player, stranger, ally], 1000);
  assert.equal(ally.hitpoints, 10);
  assert.equal(ally.bear.hitpoints, 5.5);
  assert.equal(player.hitpoints, 80);
  assert.equal(stranger.hitpoints, 1);
  tickTalentEffects(scene, [player, ally], 2000);
  assert.equal(ally.hitpoints, 10);
  assert.equal(ally.bear.hitpoints, 5.5);
});
