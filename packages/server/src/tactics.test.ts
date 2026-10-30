import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_TACTICS,
  tacticsSchema,
  type Player,
  type SceneState,
  type Enemy,
} from '@emberfall/common';
import {
  attackTarget,
  healingTarget,
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
import { CharacterStore, freshProgress } from './characters.ts';
import { Peer } from './network/peer.ts';
import { createRuntime } from './runtime.ts';
import { tickTalentEffects } from '../../core/src/talent-effects.ts';

const tactics = () => structuredClone(DEFAULT_TACTICS);
const hero = (classId = 'druid'): Player => ({
  ...freshProgress(classId),
  id: 'hero',
  name: 'Hero',
  classId,
  level: 20,
  x: 1000,
  y: 1000,
  color: 0,
  scene: 'forest',
  tactics: tactics(),
});
const enemy = (id: number, x: number, hp = 100, kind?: Enemy['kind']): Enemy => ({
  id,
  x,
  y: 1000,
  hitpoints: hp,
  maxHitpoints: 100,
  kind,
  angle: 0,
});
const arena = (enemies: Enemy[] = []): SceneState => ({
  id: 'test',
  type: 'Forest',
  difficulty: 'Easy',
  phase: 'active',
  ready: [],
  countdownAt: null,
  endsAt: null,
  nextSpawn: 1e9,
  sequence: 0,
  enemies,
  damage: [],
  portals: [],
});

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
    if (training) Object.assign(p, TRAINING_ZONES[0]);
    p.tactics!.offensive = ['lowestHealth', 'nearest', 'elite'];
    const s = arena([enemy(1, p.x + 30), enemy(2, p.x + 70, 10)]);
    s.training = training;
    s.enemies.forEach((e) => (e.y = p.y));
    tickPlayerCombat(s, [p], 10000, 0.05);
    assert.equal(p.attackTargetId, 2);
    assert(s.playerShots!.every((shot) => shot.targetId === 2));
    p.autoTarget = false;
    p.aimX = p.x - 100;
    p.aimY = p.y;
    s.playerShots = [];
    fireClassAttack(s, p, 11000);
    assert.equal(s.playerShots![0].targetId, undefined);
    assert(Math.abs(Math.abs(s.playerShots![0].angle) - Math.PI) < 0.1);
  }
});

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
    p.tactics = { ...p.tactics!, stance: 'aggressive', distance: 'far', companionTarget: 'assist' };
    p.attackTargetId = 2;
    tickCompanion(p, s, 10002, 0);
    assert.equal(p.bear!.attackAt, 10002);
    p.bear!.x = p.x + 250;
    tickCompanion(p, s, 10003, 0);
    assert.equal(p.bear!.returning, false);
    p.tactics = { ...p.tactics!, stance: 'protect' };
    tickCompanion(p, s, 10004, 0);
    assert.equal(p.bear!.returning, true);
    assert.equal(p.bear!.attackAt, undefined);
    p.bear!.x = p.x + 501;
    tickCompanion(p, s, 10005, 0);
    assert.equal(p.bear!.x, p.x);
  }
});

test('tactics save per class, round trip through persistence, and missing old-save tactics retain defaults', async () => {
  const store = new CharacterStore(':memory:');
  await store.ready;
  try {
    const created = store.create('Tactician');
    assert.equal(created.progress.tactics, undefined);
    const p = { ...hero('warrior'), ...created.progress, classes: created.classes };
    p.tactics = { ...tactics(), keepTarget: true };
    store.save(created.id, p.name, p);
    store.selectClass(created.id, p, 'druid');
    assert.equal(p.tactics, undefined);
    p.tactics = { ...tactics(), stance: 'passive' };
    store.save(created.id, p.name, p);
    store.selectClass(created.id, p, 'warrior');
    assert.equal(p.tactics!.keepTarget, true);
    assert.equal(store.load(created.token).classes.druid.tactics!.stance, 'passive');
  } finally {
    store.close();
  }
});

test('failed saves, malformed commands and a mismatched class cannot publish tactics', async (t) => {
  const runtime = await createRuntime();
  const messages: { type: string; message?: string; characterToken?: string }[] = [];
  const peer = new Peer(
    (message) => messages.push(message),
    () => {},
  );
  try {
    runtime.connect(peer);
    const world = [...runtime.worlds.values()][0];
    peer.receive({ type: 'join', worldId: world.id, playerName: 'Tactician', password: '' });
    for (let i = 0; i < 200 && !world.players.size; i++)
      await new Promise((resolve) => setTimeout(resolve, 10));
    const p = [...world.players.values()][0];
    const command = {
      type: 'setTactics',
      classId: 'warrior',
      tactics: { ...tactics(), keepTarget: true },
    };
    peer.receive({ ...command, classId: 'mage' });
    assert.equal(p.tactics, undefined);
    peer.receive({ ...command, tactics: { ...command.tactics, offensive: ['elite'] } });
    assert.equal(p.tactics, undefined);
    const failure = t.mock.method(runtime.characters, 'save', () => {
      throw new Error('write failed');
    });
    peer.receive(command);
    assert.equal(p.tactics, undefined);
    assert.match(messages.at(-1)!.message!, /Unable to save/);
    failure.mock.restore();
    peer.receive(command);
    assert.equal(p.tactics!.keepTarget, true);
    const token = messages.find((message) => message.type === 'joined')!.characterToken!;
    assert.equal(runtime.characters.load(token).progress.tactics!.keepTarget, true);
  } finally {
    t.mock.restoreAll();
    await runtime.close();
  }
});
