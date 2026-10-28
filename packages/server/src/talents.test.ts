import assert from 'node:assert/strict';
import test from 'node:test';
import type { Player, SceneState } from '@emberfall/common';
import {
  TALENT_TREE,
  TALENT_LEVELS,
  talentNodeId,
  talentRank,
  availableTalentPoints,
  canLearnTalent,
  learnTalent,
  equipTalent,
  normalizeTalents,
  characterStats,
  castTalentAbility,
  resetTalents,
  BULLSEYE,
  TRAINING_ZONES,
  game,
  FOREST,
} from '@emberfall/core';
import {
  talentAilmentChance,
  talentIncomingDamage,
  tickTalentEffects,
} from '../../core/src/talent-effects.ts';
import { CharacterStore, freshProgress } from './characters.ts';
const hero = (classId = 'warrior'): Player => ({
  ...freshProgress(classId),
  id: 'hero',
  name: 'Hero',
  classId,
  level: 20,
  x: 1000,
  y: 1000,
  color: 0,
  scene: 'forest',
});
const arena = (): SceneState => ({
  id: 'test',
  type: 'Forest',
  difficulty: 'Easy',
  phase: 'active',
  ready: [],
  countdownAt: null,
  endsAt: null,
  nextSpawn: 1e9,
  sequence: 0,
  enemies: [{ id: 1, x: 1050, y: 1000, hitpoints: 1000, maxHitpoints: 1000, angle: 0 }],
  damage: [],
  portals: [],
});
function ability(player: Player, column: number, row: number, rank = 1) {
  const id = talentNodeId(player.classId!, column, row);
  for (let i = 0; i < rank; i++) learnTalent(player, id);
  equipTalent(player, 0, id);
  return id;
}
function cast(player: Player, scene: SceneState, now = 1000, players = [player]) {
  return castTalentAbility(
    scene,
    player,
    {
      slot: 0,
      classId: player.classId!,
      epoch: player.scene ? scene.id : 'lobby',
      aimX: 1050,
      aimY: 1000,
    },
    now,
    game,
    players,
  );
}

test('talent auto-target selects a living enemy in range across seams and preserves manual aim', () => {
  for (const training of [false, true])
    for (const autoTarget of [false, true]) {
      const player = hero('mage'),
        scene = arena();
      player.autoTarget = autoTarget;
      player.x = training ? TRAINING_ZONES[0].x : 10;
      player.y = training ? TRAINING_ZONES[0].y : 1000;
      if (training) player.scene = undefined;
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

test('Mending Seed and Renewal heal the lowest HP percentage in range, including wrapped party members', () => {
  for (const training of [false, true])
    for (const row of [1, 7])
      for (const learned of [1, 2]) {
        const player = hero('druid'),
          scene = arena();
        scene.training = training;
        player.partyId = 'party';
        player.hitpoints = 80;
        player.maxHitpoints = 100;
        player.x = training ? TRAINING_ZONES[0].x : 10;
        player.y = training ? TRAINING_ZONES[0].y : 1000;
        if (training) player.scene = undefined;
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
        for (const excluded of [outside, stranger, otherArea, otherRun, disconnected])
          assert.equal(excluded.hitpoints, 1);
        assert.equal(dead.hitpoints, 0);
        assert.equal(full.hitpoints, 100);
        assert.equal(scene.explosions?.[0].x, ally.x);
        if (row === 7)
          assert.equal(talentIncomingDamage(scene, player, 100, 1001), learned === 2 ? 25 : 40);
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
  assert(cast(player, scene));
  tickTalentEffects(scene, [player, stranger, ally], 1000);
  assert.equal(ally.hitpoints, 13);
  assert.equal(player.hitpoints, 80);
  assert.equal(stranger.hitpoints, 1);
  tickTalentEffects(scene, [player, ally], 2000);
  assert.equal(ally.hitpoints, 13);
});
test('all classes have thirty independent talents and twelve abilities, with a defensive third column', () => {
  assert.equal(TALENT_TREE.length, 120);
  for (const classId of ['warrior', 'ranger', 'mage', 'druid']) {
    const nodes = TALENT_TREE.filter((node) => node.classId === classId);
    assert.equal(nodes.length, 30);
    assert.equal(nodes.filter((node) => node.kind === 'ability').length, 12);
    assert.deepEqual(
      nodes.filter((node) => node.column === 0).map((node) => node.level),
      TALENT_LEVELS,
    );
  }
});
test('one starting point, two ranks, level-only gates, no stat bonuses and no paragon points', () => {
  const player = hero();
  player.level = 1;
  assert.equal(availableTalentPoints(player), 1);
  const first = talentNodeId('warrior', 0, 0),
    high = talentNodeId('warrior', 2, 9);
  assert.equal(canLearnTalent(player, high), false);
  learnTalent(player, first);
  assert.equal(availableTalentPoints(player), 0);
  assert.throws(() => learnTalent(player, first));
  player.level = 2;
  learnTalent(player, first);
  assert.equal(talentRank(player, first), 2);
  assert.throws(() => learnTalent(player, first));
  player.level = 20;
  player.paragon = 999;
  learnTalent(player, high);
  assert.equal(availableTalentPoints(player), 17);
  assert.throws(() => learnTalent(player, talentNodeId('mage', 0, 0)));
  const learned = characterStats(player);
  assert.deepEqual(learned, characterStats({ ...player, talents: {} }));
});
test('a whole column costs exactly twenty points; mixing columns and inactive extensions is allowed', () => {
  for (const classId of ['warrior', 'ranger', 'mage', 'druid']) {
    const player = hero(classId);
    for (let row = 0; row < 10; row++)
      for (let n = 0; n < 2; n++) learnTalent(player, talentNodeId(classId, 0, row));
    assert.equal(availableTalentPoints(player), 0);
    assert.throws(() => learnTalent(player, talentNodeId(classId, 1, 0)));
  }
  const player = hero();
  learnTalent(player, talentNodeId('warrior', 0, 6));
  learnTalent(player, talentNodeId('warrior', 2, 8));
  assert.equal(availableTalentPoints(player), 18);
});
test('migration refunds old allocations once and repairs wrong-class, overbudget and locked ranks', () => {
  const player = hero();
  player.talentVersion = undefined;
  player.talents = { 'path-0-1': 1, strength: 99 };
  normalizeTalents(player, 'warrior');
  assert.deepEqual(player.talents, {});
  assert.equal(availableTalentPoints(player), 20);
  ability(player, 1, 1, 2);
  const snapshot = structuredClone(player);
  normalizeTalents(player, 'warrior');
  assert.deepEqual(player, snapshot);
  player.talents![talentNodeId('mage', 0, 0)] = 1;
  normalizeTalents(player, 'warrior');
  assert.deepEqual(player.talents, {});
  player.level = 1;
  player.talents = { [talentNodeId('warrior', 0, 9)]: 2 };
  normalizeTalents(player, 'warrior');
  assert.equal(availableTalentPoints(player), 1);
});
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
test('save failure cannot publish learned points or equipped slots; bullseye reset remains transactional', async (t) => {
  const { createRuntime } = await import('./runtime.ts');
  const { Peer } = await import('./network/peer.ts');
  const runtime = await createRuntime();
  const messages: { type: string; message?: string; characterToken?: string }[] = [];
  const peer = new Peer(
    (message) => messages.push(message),
    () => {},
  );
  try {
    runtime.connect(peer);
    const world = [...runtime.worlds.values()][0];
    peer.receive({ type: 'join', worldId: world.id, playerName: 'Talent hero', password: '' });
    for (let i = 0; i < 200 && !world.players.size; i++)
      await new Promise((resolve) => setTimeout(resolve, 10));
    const player = [...world.players.values()][0];
    player.level = 20;
    const id = talentNodeId('warrior', 0, 1);
    const fail = t.mock.method(runtime.characters, 'save', () => {
      throw new Error('failed save');
    });
    peer.receive({ type: 'learnTalent', nodeId: id });
    assert.match(messages.at(-1)!.message!, /Unable to save/);
    assert.equal(talentRank(player, id), 0);
    fail.mock.restore();
    peer.receive({ type: 'learnTalent', nodeId: id });
    assert.equal(talentRank(player, id), 1);
    peer.receive({ type: 'equipTalent', slot: 0, nodeId: id });
    assert.equal(player.talentSlots?.[0], id);
    player.coins = 100;
    peer.receive({ type: 'resetTalents', classId: 'warrior' });
    assert.equal(player.coins, 100);
    player.x = BULLSEYE!.x;
    player.y = BULLSEYE!.y - 15;
    peer.receive({ type: 'resetTalents', classId: 'warrior' });
    assert.equal(player.coins, 50);
    assert.equal(availableTalentPoints(player), 20);
    const token = messages.find((message) => message.type === 'joined')!.characterToken!;
    const saved = runtime.characters.load(token)!;
    assert.equal(saved.progress.coins, 50);
    assert.equal(availableTalentPoints(saved.progress), 20);
  } finally {
    t.mock.restoreAll();
    await runtime.close();
  }
});
test('per-class allocations and selected abilities survive a save round trip', async () => {
  const store = new CharacterStore(':memory:');
  await store.ready;
  try {
    const created = store.create('Talent hero');
    const player = {
      ...hero(),
      ...created.progress,
      classId: 'warrior',
      level: 20,
      classes: created.classes,
    } as Player;
    ability(player, 0, 1, 2);
    store.save(created.id, player.name, player);
    const loaded = store.load(created.token)!;
    assert.equal(talentRank(loaded.progress, talentNodeId('warrior', 0, 1)), 2);
    assert.equal(loaded.progress.talentSlots?.[0], talentNodeId('warrior', 0, 1));
    assert.equal(availableTalentPoints(loaded.classes.mage), 1);
  } finally {
    store.close();
  }
});

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
