import assert from 'node:assert/strict';
import test from 'node:test';
import { tacticsSchema, type Enemy } from '@emberfall/common';
import {
  attackTarget,
  castTalentAbility,
  tickCompanion,
  tickPlayerCombat,
  fireClassAttack,
  nearestSpellTarget,
  learnTalent,
  equipTalent,
  talentNodeId,
  FOREST,
  TRAINING_ZONES,
  clientMessage,
} from '@emberfall/core';

import { tactics, hero, arena } from './tactics.fixture.ts';

const enemy = (id: number, x: number, hp = 100, kind?: Enemy['kind']): Enemy => {
  return {
    id,
    x,
    y: 1000,
    hitpoints: hp,
    maxHitpoints: 100,
    kind,
    angle: 0,
  };
};

test('tactics rejects duplicate, missing, unknown and unbounded preferences at command/save boundaries', () => {
  assert(tacticsSchema.safeParse(tactics()).success);

  for (const patch of [
    { offensive: ['nearest', 'nearest', 'elite'] },
    { offensive: ['nearest'] },
    { defensive: ['self', 'players', 'unknown'] },
    { healBelow: 0.6 },
    { distance: Infinity },
    { stance: 'teleport' },
  ]) {
    assert(!tacticsSchema.safeParse({ ...tactics(), ...patch }).success);
    assert(
      !clientMessage.safeParse({
        type: 'setTactics',
        classId: 'druid',
        tactics: { ...tactics(), ...patch },
      }).success,
    );
  }

  assert(
    !clientMessage.safeParse({ type: 'setTactics', classId: 'unknown', tactics: tactics() })
      .success,
  );
});

test('ordered attacks prefer health or elites, retain valid targets, and exclude dead/out-of-range targets across seams', () => {
  const p = hero(),
    enemies = [
      enemy(1, 1020),
      enemy(2, 1080, 10),
      enemy(3, 1100, 100, 'boss'),
      enemy(4, 1201, 1, 'boss'),
    ];
  assert.equal(nearestSpellTarget(p, enemies, 200)?.id, 1);
  p.tactics!.offensive = ['lowestHealth', 'elite', 'nearest'];
  assert.equal(nearestSpellTarget(p, enemies, 200)?.id, 2);
  p.tactics!.offensive = ['elite', 'lowestHealth', 'nearest'];
  assert.equal(nearestSpellTarget(p, enemies, 200)?.id, 3);
  p.tactics!.keepTarget = true;
  p.attackTargetId = 1;
  assert.equal(nearestSpellTarget(p, enemies, 200)?.id, 1);
  enemies[0].hitpoints = 0;
  assert.equal(nearestSpellTarget(p, enemies, 200)?.id, 3);
  enemies[2].x = 1201;
  assert.equal(nearestSpellTarget(p, enemies, 200)?.id, 2);
  p.x = 5;
  assert.equal(attackTarget(p, [enemy(5, FOREST.width - 5)], 10)?.id, 5);
  assert.equal(attackTarget(p, [enemy(5, FOREST.width - 5.01)], 10), undefined);
});

test('automatic weapon launch and replicated target use offensive priorities while manual aim stays manual in forest and training', () => {
  for (const training of [false, true]) {
    const p = hero('ranger');
    p.scene = training ? undefined : 'forest';

    if (training) {
      Object.assign(p, TRAINING_ZONES[0]);
    }

    p.tactics!.offensive = ['lowestHealth', 'nearest', 'elite'];
    const s = arena([enemy(1, p.x + 30), enemy(2, p.x + 70, 10)]);
    s.training = training;
    s.enemies.forEach((e) => {
      return (e.y = p.y);
    });
    tickPlayerCombat(s, [p], 10000, 0.05);
    assert.equal(p.attackTargetId, 2);
    assert(
      s.playerShots!.every((shot) => {
        return shot.targetId === 2;
      }),
    );
    p.autoTarget = false;
    p.aimX = p.x - 100;
    p.aimY = p.y;
    s.playerShots = [];
    fireClassAttack(s, p, 11000);
    assert.equal(s.playerShots[0].targetId, undefined);
    assert(Math.abs(Math.abs(s.playerShots[0].angle) - Math.PI) < 0.1);
  }
});

test('aimed talents choose the preferred enemy and companion hazard avoidance can be disabled', () => {
  const p = hero(),
    s = arena([enemy(1, 1050), enemy(2, 1350, 10)]);
  tickCompanion(p, s, 0, 0);
  const nearbyHealth = s.enemies[0].hitpoints;
  p.tactics!.offensive = ['lowestHealth', 'nearest', 'elite'];
  const id = talentNodeId('druid', 1, 1);
  learnTalent(p, id);
  equipTalent(p, 0, id);
  assert(
    castTalentAbility(
      s,
      p,
      { slot: 0, classId: 'druid', epoch: s.id, aimX: 1050, aimY: 1000 },
      1000,
    ),
  );
  assert.equal(p.bear!.x, 1350);
  assert.equal(s.enemies[0].hitpoints, nearbyHealth);

  for (const avoidHazards of [true, false]) {
    const owner = hero(),
      scene = arena([enemy(1, 1060)]);
    owner.tactics = { ...tactics(), avoidHazards };
    scene.enemies[0].attack = {
      startedAt: 0,
      endsAt: 2000,
      x: 990,
      y: 1000,
      radius: 40,
      ranged: false,
    };
    tickCompanion(owner, scene, 1000, 0.05);
    assert.equal(owner.bear!.moving, true);
    assert(avoidHazards ? owner.bear!.x > owner.x : owner.bear!.x < owner.x);
  }
});

test('companion stances, preferred distance, assist and changed preferences affect the authoritative decision immediately', () => {
  for (const training of [false, true]) {
    const p = hero(),
      s = arena([enemy(1, 1060), enemy(2, 1260, 10)]);
    p.scene = training ? undefined : 'forest';
    s.training = training;
    tickCompanion(p, s, 10000, 0);
    assert.equal(p.bear!.attackAngle, 0);
    p.tactics = { ...p.tactics!, stance: 'passive' };
    tickCompanion(p, s, 10001, 0);
    assert.equal(p.bear!.attackAt, undefined);
    p.tactics = { ...p.tactics, stance: 'aggressive', distance: 'far', companionTarget: 'assist' };
    p.attackTargetId = 2;
    tickCompanion(p, s, 10002, 0);
    assert.equal(p.bear!.attackAt, 10002);
    p.bear!.x = p.x + 250;
    tickCompanion(p, s, 10003, 0);
    assert.equal(p.bear!.returning, false);
    p.tactics = { ...p.tactics, stance: 'protect' };
    tickCompanion(p, s, 10004, 0);
    assert.equal(p.bear!.returning, true);
    assert.equal(p.bear!.attackAt, undefined);
    p.bear!.x = p.x + 501;
    tickCompanion(p, s, 10005, 0);
    assert.equal(p.bear!.x, p.x);
  }
});
