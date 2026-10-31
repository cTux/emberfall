import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Enemy, Player } from '@emberfall/common';
import {
  characterStats,
  companionStats,
  createTrainingScene,
  hitWithWeapon,
  tickDebuffs,
  itemTypeStats,
  ItemStat,
  Rarity,
  statValue,
  game,
  useBackpackItem as equipBackpackItem,
  unequipItem,
  talentCooldownMs,
  talentAbility,
  createGame,
  baseMod,
  GEAR_DEFINITIONS,
  learnTalent,
  talentNodeId,
} from '@emberfall/core';
import { applyTalentAilment } from '../../core/src/talent-effects.ts';
import { freshProgress } from './characters.ts';

function hero(id = 'hero'): Player {
  const player: Player = {
    ...freshProgress('warrior'),
    id,
    name: id,
    classId: 'warrior',
    x: 1000,
    y: 1000,
    color: 0,
  };
  player.backpack = [
    {
      id: 'dot-sword',
      itemId: 'warrior-sword',
      quantity: 1,
      rarity: Rarity.Common,
      stats: { dotSpeed: statValue(ItemStat.DotSpeed, Rarity.Common) },
    },
  ];
  assert(game.rules.backpackSchema.safeParse(player.backpack).success);
  equipBackpackItem(player, 'dot-sword');

  return player;
}

test('DOT Speed is a regular offensive roll, validates exact values and leaves attacks/casts unchanged', () => {
  for (const pool of Object.values(itemTypeStats)) {
    assert.equal(pool.includes(ItemStat.DotSpeed), pool.includes(ItemStat.AttackSpeed));
  }

  for (const [rarity, value] of [
    [Rarity.Common, 2],
    [Rarity.Uncommon, 2.4],
    [Rarity.Rare, 2.8],
    [Rarity.Epic, 3.4],
    [Rarity.Legendary, 4],
  ] as const) {
    assert.equal(statValue(ItemStat.DotSpeed, rarity), value);
  }

  const player = hero();
  assert.equal(characterStats(player).bonuses.dotSpeed, 2);
  assert.equal(companionStats(player).bonuses.dotSpeed, 2);
  assert.equal(characterStats(player).attackIntervalMs, 1000);
  assert.equal(talentCooldownMs(player, 0), talentAbility(player, 0)!.intervalMs);
  const item = player.equipmentItems!.weapon;
  assert(!game.rules.backpackSchema.safeParse([{ ...item, stats: { dotSpeed: 100 } }]).success);
  unequipItem(player, 'weapon');
  assert.equal(characterStats(player).bonuses.dotSpeed, 0);
});

test('player, companion and talent DOTs use owner speed, keep cadence on refresh and catch up through expiry', (t) => {
  t.mock.method(Math, 'random', () => {
    return 0;
  });

  for (const training of [true, false]) {
    for (const kind of ['bleed', 'poison', 'burn'] as const) {
      for (const source of ['weapon', 'companion', 'talent'] as const) {
        const player = hero();
        const scene = { ...createTrainingScene(0), training, enemies: [] as Enemy[] };
        const enemy: Enemy = { id: 1, x: 1000, y: 1000, hitpoints: 10000, angle: 0 };
        scene.enemies.push(enemy);

        if (source === 'talent') {
          applyTalentAilment(enemy, player, kind, 1, 0);
        } else {
          hitWithWeapon(
            scene,
            enemy,
            player,
            0,
            kind,
            1,
            characterStats(player),
            source === 'companion',
          );
        }

        const interval = 1000 / 1.02;
        const debuff = enemy.debuffs![0];
        assert.equal(debuff.tickIntervalMs, interval);
        assert.equal(debuff.nextTick, interval);
        const before = enemy.hitpoints;
        tickDebuffs(scene, [player], interval - 0.001);
        assert.equal(enemy.hitpoints, before);
        tickDebuffs(scene, [player], interval);
        assert.equal(enemy.hitpoints, before - 1);
        const pending = debuff.nextTick;
        unequipItem(player, 'weapon');
        applyTalentAilment(enemy, player, kind, 1, 1500);
        assert.equal(debuff.nextTick, pending);
        assert.equal(debuff.tickIntervalMs, interval);
        assert.equal(debuff.expiresAt, 6500);
        const afterRefresh = enemy.hitpoints;
        tickDebuffs(scene, [player], 6500);
        assert.equal(enemy.hitpoints, afterRefresh - 10);
        assert.equal(enemy.debuffs!.length, 0);
      }
    }
  }
});

test('each owner retains a separate interval and roots/silence keep their timers', () => {
  const fast = hero(),
    slow = hero('slow');
  unequipItem(slow, 'weapon');
  const enemy: Enemy = { id: 1, x: 1000, y: 1000, hitpoints: 100, angle: 0 };
  applyTalentAilment(enemy, fast, 'burn', 1, 0);
  applyTalentAilment(enemy, slow, 'burn', 1, 0);
  applyTalentAilment(enemy, fast, 'roots', 1, 0);
  applyTalentAilment(enemy, fast, 'silence', 1, 0);
  assert.deepEqual(
    enemy.debuffs!.map((entry) => {
      return entry.tickIntervalMs;
    }),
    [1000 / 1.02, 1000, 1000, 1000],
  );
  const scene = { ...createTrainingScene(0), enemies: [enemy] };
  tickDebuffs(scene, [fast, slow], 990);
  assert.equal(enemy.hitpoints, 99);
  assert.equal(enemy.debuffs!.length, 4);
});

test('mod weapon and talent ailments use supplied context stats', (t) => {
  t.mock.method(Math, 'random', () => {
    return 0;
  });
  const context = createGame([
    baseMod,
    {
      id: 'dot-fixture',
      register(r) {
        r.items.register({ ...GEAR_DEFINITIONS['warrior-sword'], id: 'mod-sword', kind: 'gear' });
      },
    },
  ]);
  const player = hero();
  player.equipment!.weapon = 'mod-sword';
  player.equipmentItems!.weapon.itemId = 'mod-sword';
  const stats = context.rules.characterStats(player);
  assert.equal(stats.bonuses.dotSpeed, 2);
  const scene = { ...createTrainingScene(0), enemies: [] as Enemy[] };
  const enemy: Enemy = { id: 1, x: 1000, y: 1000, hitpoints: 1000, angle: 0 };
  scene.enemies.push(enemy);
  hitWithWeapon(scene, enemy, player, 0, 'bleed', 1, stats, false, context);
  applyTalentAilment(enemy, player, 'burn', 1, 0, undefined, stats);
  assert.deepEqual(
    enemy.debuffs!.map((entry) => {
      return entry.tickIntervalMs;
    }),
    [1000 / 1.02, 1000 / 1.02],
  );
  player.level = 20;
  learnTalent(player, talentNodeId('warrior', 1, 6));
  const nearby: Enemy = { ...enemy, id: 2, x: 1020, debuffs: undefined };
  scene.enemies.push(nearby);
  enemy.hitpoints = 1;
  tickDebuffs(scene, [player], 1000 / 1.02, context);
  assert.equal(enemy.hitpoints, 0);
  assert.equal(nearby.debuffs![0].tickIntervalMs, 1000 / 1.02);
});
