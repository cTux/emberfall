import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Enemy } from '@emberfall/common';
import {
  randomSource,
  Rarity,
  ItemStat,
  itemTypeStats,
  statValue,
  GEAR_DEFINITIONS,
  hitWithWeapon,
  hitEnemy,
  setRewardPlayers,
  learnTalent,
  equipTalent,
  talentNodeId,
  castTalentAbility,
} from '@emberfall/core';
import { executeTalent } from '../../core/src/talent-effects.ts';

import { hero, instance, equip, arena } from './item-rolls.fixture.ts';

test('compatible offensive talents repeat attacks and extend pierces/bounces, and scale area/range', (t) => {
  t.mock.method(randomSource, 'next', () => {
    return 0.5;
  });

  for (const [classId, weapon, stat] of [
    ['warrior', 'warrior-sword', ItemStat.AdditionalAttack],
    ['mage', 'mage-staff', ItemStat.MoreProjectiles],
    ['ranger', 'ranger-bow', ItemStat.ProjectilePierce],
    ['druid', 'druid-staff', ItemStat.ProjectilesBounce],
  ] as const) {
    const player = hero(classId);
    equip(player, 'weapon', weapon, stat);
    const scene = arena();
    scene.enemies = [
      { id: 1, x: player.x + 30, y: player.y, hitpoints: 1000, angle: 0 },
      { id: 2, x: player.x + 230, y: player.y, hitpoints: 1000, angle: 0 },
    ];
    executeTalent(scene, player, 0, talentNodeId(classId, 0, 1), 1, scene.enemies[0], 1000);
    assert.equal(scene.damage.length, 2, classId);

    if (classId === 'ranger' || classId === 'druid') {
      assert.equal(scene.damage[1].target, 'enemy:2');
    }
  }

  const player = hero('mage');
  equip(player, 'weapon', 'mage-staff', ItemStat.Range);
  equip(player, 'amulet', 'loot-amulet', ItemStat.AreaOfEffect);
  const node = talentNodeId('mage', 0, 1);
  learnTalent(player, node);
  equipTalent(player, 0, node);
  player.autoTarget = true;
  const scene = arena(false);
  scene.enemies = [{ id: 1, x: player.x + 800, y: player.y, hitpoints: 1000, angle: 0 }];
  assert(
    castTalentAbility(
      scene,
      player,
      { slot: 0, classId: 'mage', epoch: scene.id, aimX: 0, aimY: 0 },
      1000,
    ),
  );
  assert(scene.enemies[0].hitpoints < 1000);
});

test('passive talent areas scale and extra talent attacks independently apply on-hit procs', (t) => {
  t.mock.method(randomSource, 'next', () => {
    return 0.5;
  });
  const player = hero();
  equip(player, 'amulet', 'loot-amulet', ItemStat.AreaOfEffect);
  learnTalent(player, talentNodeId('warrior', 0, 0));
  const scene = arena();
  const target: Enemy = { id: 1, x: player.x + 30, y: player.y, hitpoints: 1000, angle: 0 };
  scene.enemies = [target, { ...target, id: 2, x: target.x + 110 }];

  for (let hit = 0; hit < 3; hit++) {
    hitWithWeapon(scene, target, player, 1000 + hit);
  }

  assert.equal(
    scene.damage.filter((hit) => {
      return hit.target === 'enemy:2';
    }).length,
    1,
  );
  t.mock.restoreAll();
  t.mock.method(randomSource, 'next', () => {
    return 0.1;
  });
  const warrior = hero();
  equip(warrior, 'weapon', 'warrior-sword', ItemStat.AdditionalAttack);
  learnTalent(warrior, talentNodeId('warrior', 1, 2));
  const other = arena();
  other.enemies = [{ ...target }];
  executeTalent(other, warrior, 0, talentNodeId('warrior', 0, 1), 1, other.enemies[0], 1000);
  assert.equal(other.damage.length, 2);
  assert.equal(
    other.enemies[0].debuffs?.find((entry) => {
      return entry.kind === 'bleed';
    })?.stacks,
    2,
  );
});

test('whole party bonuses add once at drop generation, with guaranteed extras and fractional chance; training stays reward-free', (t) => {
  const killer = hero();
  killer.partyId = 'party';
  const member = hero('mage', 'support');
  member.partyId = 'party';
  member.scene = undefined;
  const stranger = hero('mage', 'stranger');

  for (const player of [killer, member, stranger]) {
    for (const [slot, itemId] of [
      ['helmet', 'loot-helmet'],
      ['bodyArmor', 'loot-bodyArmor'],
      ['leggings', 'loot-leggings'],
      ['boots', 'loot-boots'],
      ['amulet', 'loot-amulet'],
      ['ring', 'loot-ring'],
    ]) {
      const item = instance(itemId, ItemStat.GoldIncrease);
      item.stats = {
        goldIncrease: 20,
        expIncrease: 40,
        [itemTypeStats[GEAR_DEFINITIONS[itemId].gearType][0]]: statValue(
          itemTypeStats[GEAR_DEFINITIONS[itemId].gearType][0],
          Rarity.Legendary,
        ),
      };
      player.equipment![slot] = itemId;
      player.equipmentItems = { ...player.equipmentItems, [slot]: item };
    }
  }

  for (const [roll, expectedGold, expectedXp] of [
    [0.3, 4, 6],
    [0.9, 3, 5],
  ] as const) {
    const scene = arena(false);
    setRewardPlayers(scene, [killer, member, member, stranger]);
    // Gold gate succeeds, then the two independent bonus remainder rolls use the selected value.
    const values = [roll, 0, roll, 0.99];
    t.mock.method(randomSource, 'next', () => {
      return values.shift() ?? 0.99;
    });
    const target = { id: 1, x: 2400, y: 1280, hitpoints: 1, angle: 0 };
    hitEnemy(scene, target, 1, killer, 1000);
    assert.equal(
      scene.drops!.filter((drop) => {
        return drop.kind === 'gold';
      }).length,
      expectedGold,
    );
    assert.equal(
      scene.drops!.filter((drop) => {
        return drop.kind === 'experience';
      }).length,
      expectedXp,
    );
    hitEnemy(scene, target, 1, killer, 1000);
    assert.equal(scene.drops!.length, expectedGold + expectedXp);
    t.mock.restoreAll();
  }

  const scene = arena();
  setRewardPlayers(scene, [killer, member]);
  hitEnemy(scene, { id: 1, x: 2400, y: 1280, hitpoints: 1, angle: 0 }, 1, killer, 1000);
  assert.equal(scene.drops?.length ?? 0, 0);
});
