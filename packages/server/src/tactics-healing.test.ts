import assert from 'node:assert/strict';
import test from 'node:test';

import {
  healingTarget,
  castTalentAbility,
  tickCompanion,
  learnTalent,
  equipTalent,
  talentNodeId,
  TRAINING_ZONES,
} from '@emberfall/core';

import { tickTalentEffects } from '../../core/src/talent-effects.ts';
import { hero, arena } from './tactics.fixture.ts';

test('healing applies ordered preferences after party, scene, run, connection, range and life eligibility', () => {
  const p = hero();
  p.partyId = 'party';
  p.runId = 'run';
  p.hitpoints = p.maxHitpoints * 0.8;
  tickCompanion(p, arena(), 0, 0);
  p.bear!.hitpoints = p.bear!.maxHitpoints * 0.1;
  const ally = { ...hero('warrior'), id: 'ally', partyId: 'party', runId: 'run', hitpoints: 30 };
  assert.equal(healingTarget([p, ally], p, p, 700), p.bear);
  p.tactics!.defensive = ['players', 'lowestHealth', 'self'];
  assert.equal(healingTarget([p, ally], p, p, 700), ally);
  p.tactics!.defensive = ['self', 'lowestHealth', 'players'];
  assert.equal(healingTarget([p, ally], p, p, 700), p);
  p.tactics!.includeCompanions = false;
  p.hitpoints = p.maxHitpoints;
  for (const patch of [
    { partyId: 'other' },
    { runId: 'other' },
    { scene: undefined },
    { reconnecting: true },
    { x: 1800 },
    { hitpoints: 0 },
  ]) {
    assert.equal(healingTarget([p, { ...ally, ...patch }], p, p, 700), undefined);
  }

  assert.equal(healingTarget([p, ally], p, p, 700, 0.3), undefined);
  assert.equal(healingTarget([p, ally], p, p, 700, 0.5), ally);
});

test('automatic healing waits below threshold without spending cooldown; manual casts and healing pulses still work', () => {
  for (const training of [false, true]) {
    const p = hero();
    p.scene = training ? undefined : 'forest';
    if (training) Object.assign(p, TRAINING_ZONES[0]);
    p.hitpoints = p.maxHitpoints * 0.8;
    p.tactics!.includeCompanions = false;
    p.tactics!.healBelow = 0.5;
    const s = arena();
    s.training = training;
    const id = talentNodeId('druid', 2, 1);
    learnTalent(p, id);
    equipTalent(p, 0, id);
    const request = {
      slot: 0,
      classId: 'druid',
      epoch: training ? 'lobby' : s.id,
      aimX: p.x,
      aimY: p.y,
      automatic: true,
    };
    assert.equal(castTalentAbility(s, p, request, 1000), false);
    assert.equal(p.talentCooldowns, undefined);
    assert(castTalentAbility(s, p, { ...request, automatic: false }, 1000));
    assert(p.hitpoints > p.maxHitpoints * 0.8);
    p.talentCooldowns = {};
    p.hitpoints = p.maxHitpoints * 0.4;
    assert(castTalentAbility(s, p, request, 2000));
    assert(p.hitpoints > p.maxHitpoints * 0.4);
    const grove = talentNodeId('druid', 2, 3);
    learnTalent(p, grove);
    equipTalent(p, 0, grove);
    assert(castTalentAbility(s, p, { ...request, automatic: false }, 10000));
    p.hitpoints = p.maxHitpoints * 0.8;
    const before = p.hitpoints;
    tickTalentEffects(s, [p], 11000);
    assert(p.hitpoints > before, 'ongoing Grove pulses ignore the automatic cast threshold');
  }
});

test('automatic heal thresholds filter recipients before self-first preferences', () => {
  const p = hero(),
    ally = { ...hero('warrior'), id: 'ally', partyId: 'party', hitpoints: 40 };
  p.partyId = 'party';
  p.hitpoints = p.maxHitpoints * 0.8;
  p.tactics!.healBelow = 0.5;
  p.tactics!.defensive = ['self', 'lowestHealth', 'players'];
  const s = arena();
  const id = talentNodeId('druid', 2, 1);
  learnTalent(p, id);
  equipTalent(p, 0, id);
  assert(
    castTalentAbility(
      s,
      p,
      { slot: 0, classId: 'druid', epoch: s.id, aimX: p.x, aimY: p.y, automatic: true },
      1000,
      undefined,
      [p, ally],
    ),
  );
  assert.equal(p.hitpoints, p.maxHitpoints * 0.8);
  assert.equal(ally.hitpoints, 52);
});
