import {
  createGame,
  baseMod,
  CLASS_IDS,
  EQUIPMENT_SLOTS,
  SLOT_GEAR_TYPES,
  characterStats,
  validateClassEquipment,
  canEquip,
  clientMessage,
  tickPlayerCombat,
  defaultSpellRange,
  requestPlayerCast,
  stepCombat,
} from '@emberfall/core';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import type { GearDefinition } from '@emberfall/common';

import { hero, scene } from './equipment.fixture.ts';

test('every class starts with exactly its compatible weapon and preserves base stats', () => {
  const expected = {
    warrior: [5, 75, 'physical'],
    ranger: [5, 1000, 'poison'],
    mage: [3, 250, 'fire'],
    druid: [3, 250, 'nature'],
  };

  for (const classId of CLASS_IDS) {
    const player = hero(classId);
    assert.deepEqual(Object.keys(player.equipment!), ['weapon']);
    const stats = characterStats(player);
    assert.deepEqual(
      [stats.power, stats.range, stats.damageType],
      expected[classId as 'warrior' | 'ranger' | 'mage' | 'druid'],
    );
    assert.equal(stats.attackIntervalMs, 1000);
    assert.equal(stats.criticalChance, 0.05);
    assert.equal(stats.criticalMultiplier, 1.5);
    assert.deepEqual(validateClassEquipment(player.equipment!, classId), player.equipment);
  }

  assert.throws(() => {
    return validateClassEquipment({ weapon: 'mage-staff' }, 'warrior');
  });
  assert.throws(() => {
    return validateClassEquipment({ ring: 'warrior-sword' }, 'warrior');
  });
  assert.throws(() => {
    return validateClassEquipment({ weapon: 'forged-item' }, 'warrior');
  });
  assert.throws(() => {
    return validateClassEquipment({ unknown: 'warrior-sword' }, 'warrior');
  });

  for (const [gearType, allowed] of [
    ['shield', 'warrior'],
    ['quiver', 'ranger'],
    ['orb', 'mage'],
    ['natureFocus', 'druid'],
  ] as const) {
    const item: GearDefinition = { id: 'test', name: 'Off-hand', gearType, stats: {} };

    for (const classId of CLASS_IDS) {
      assert.equal(canEquip('offHand', item, classId), classId === allowed);
    }
  }
});

test('all nine slots aggregate and gear controls real power, range, cadence and defense', (t) => {
  t.mock.method(Math, 'random', () => {
    return 0.5;
  });
  const items: GearDefinition[] = [];
  const player = hero();

  for (const slot of EQUIPMENT_SLOTS.filter((slot) => {
    return slot !== 'weapon';
  })) {
    const id = `test-${slot}`;
    items.push({
      id,
      name: id,
      gearType: SLOT_GEAR_TYPES[slot][0],
      stats: {
        power: 1,
        attacksPerSecond: 1 / 8,
        range: 2,
        manualRange: 2,
        armor: 12.5,
        maxHitpoints: 5,
      },
    });
    player.equipment![slot] = id;
  }

  const context = createGame([
    baseMod,
    {
      id: 'slots-fixture',
      register(r) {
        for (const item of items) {
          r.items.register({ ...item, kind: 'gear' });
        }
      },
    },
  ]);
  const { characterStats, syncEquipmentVitals } = context.rules;
  const stats = characterStats(player);
  assert.equal(stats.power, 13);
  assert.equal(defaultSpellRange(player, context), 91);
  assert.equal(stats.damageReduction, 0.5);
  syncEquipmentVitals(player);
  assert.equal(player.maxHitpoints, 140);
  const arena = scene(false);
  player.scene = 'forest';
  arena.enemies[0].x = player.x + 97;
  tickPlayerCombat(arena, [player], 1000, 0.05, context);
  assert.equal(arena.enemies[0].hitpoints, 87, 'extended sword range and summed power apply');
  const interval = stats.attackIntervalMs;
  tickPlayerCombat(arena, [player], 1000 + interval - 1, 0.05, context);
  assert.equal(arena.enemies[0].hitpoints, 87);
  tickPlayerCombat(arena, [player], 1000 + interval, 0.05, context);
  assert.equal(arena.enemies[0].hitpoints, 74);
  player.autoAttack = false;
  arena.enemies[0].x = player.x;
  Object.assign(arena.enemies[0], {
    attack: { startedAt: 0, endsAt: 2000, x: player.x, y: player.y, radius: 100, ranged: false },
  });
  stepCombat(arena, [player], 2000, 0.05, context);
  assert.equal(player.hitpoints, 98.5, '100 armor halves a 3 damage enemy attack');
});

test('empty weapons cannot attack, while client messages cannot inject equipment', () => {
  const player = { ...hero(), equipment: {}, scene: 'forest' as const };
  const arena = scene(false);
  tickPlayerCombat(arena, [player], 1000, 0.05);
  assert.equal(arena.damage.length, 0);
  assert.equal(defaultSpellRange(player), 0);
  assert.equal(
    requestPlayerCast(
      arena,
      player,
      {
        type: 'cast',
        id: 1,
        epoch: 's',
        classId: 'warrior',
        autoTarget: true,
        aimX: 2400,
        aimY: 1280,
      },
      1000,
    ),
    false,
  );
  const parsed = clientMessage.parse({
    type: 'selectClass',
    classId: 'mage',
    equipment: { weapon: 'warrior-sword' },
    power: 9999,
  });
  assert.deepEqual(parsed, { type: 'selectClass', classId: 'mage' });
});
