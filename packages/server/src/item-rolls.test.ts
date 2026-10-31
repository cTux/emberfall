import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createGame,
  baseMod,
  Rarity,
  ItemStat,
  rarityStatCount,
  rarityColor,
  itemTypeStats,
  itemStatWeight,
  legendaryItemStat,
  statValue,
  rollItemStats,
  rollRarity,
  rollItem,
  itemRarity,
  GEAR_DEFINITIONS,
  LOOT_ITEM_IDS,
  characterStats,
  useBackpackItem,
  freshMerchant,
  backpackSchema,
  game,
} from '@emberfall/core';

import { hero, instance } from './item-rolls.fixture.ts';

test('mod gear types without a roll pool retain unrolled Common compatibility', () => {
  const context = createGame([
    baseMod,
    {
      id: 'custom-gear',
      register(r) {
        r.gearTypes.register({ id: 'custom:charm', label: 'Charm' });
        r.items.register({
          id: 'custom:charm',
          name: 'Charm',
          kind: 'gear',
          gearType: 'custom:charm',
          stats: { armor: 1 },
          loot: true,
        });
      },
    },
  ]);
  const item = context.rules.rollItem('custom:charm');
  assert(context.rules.backpackSchema.safeParse([item]).success);
  assert.equal(itemRarity(item), Rarity.Common);
  assert.equal(item.stats, undefined);
  assert(context.rules.merchantSchema.safeParse(context.rules.freshMerchant()).success);
});

test('one rarity roll has exact disjoint percentage ranges including Common remainder', () => {
  for (const [percent, rarity] of [
    [0, Rarity.Legendary],
    [0.00999, Rarity.Legendary],
    [0.01001, Rarity.Epic],
    [0.10999, Rarity.Epic],
    [0.11001, Rarity.Rare],
    [1.10999, Rarity.Rare],
    [1.11001, Rarity.Uncommon],
    [11.10999, Rarity.Uncommon],
    [11.11001, Rarity.Common],
    [99.9999, Rarity.Common],
  ] as const) {
    assert.equal(
      rollRarity(() => {
        return percent / 100;
      }),
      rarity,
    );
  }

  assert.equal(itemRarity(), Rarity.Common);
  assert.equal(new Set(Object.values(rarityColor)).size, 5);
});

test('all gear pools include reward stats, distinct configured values and restricted low-weight legendary stats', () => {
  for (const [type, pool] of Object.entries(itemTypeStats)) {
    assert(pool.includes(ItemStat.GoldIncrease));
    assert(pool.includes(ItemStat.ExpIncrease));
    for (const rarity of Object.values(Rarity)) {
      for (const roll of [0, 0.3, 0.99999]) {
        const stats = rollItemStats(type, rarity, () => {
          return roll;
        });
        assert.equal(Object.keys(stats).length, rarityStatCount[rarity]);
        for (const [stat, value] of Object.entries(stats)) {
          assert(pool.includes(stat as ItemStat));
          assert.equal(value, statValue(stat as ItemStat, rarity));
          if (itemStatWeight[stat as ItemStat] < 1) {
            assert.equal(rarity, Rarity.Legendary);
            assert.equal(legendaryItemStat[type], stat);
            assert.equal(value, 1);
          }
        }
      }
    }
  }

  assert.equal(statValue(ItemStat.AttackSpeed, Rarity.Uncommon), 2.4);
  assert.equal(statValue(ItemStat.MovementSpeed, Rarity.Epic), 3 * 1.7);
  let specials = 0;
  for (let index = 0; index < 820; index++) {
    if (
      ItemStat.AdditionalAttack in
      rollItemStats('sword', Rarity.Legendary, () => {
        return (index + 0.5) / 820;
      })
    ) {
      specials++;
    }
  }

  assert(
    specials > 0 && specials < 820 / 3,
    'special is possible but substantially less likely than normal rolls',
  );
});

test('every generated loot and merchant gear item validates; old items remain untouched Common', () => {
  for (const id of LOOT_ITEM_IDS) {
    assert(backpackSchema.safeParse([rollItem(id)]).success);
  }

  const merchant = freshMerchant();
  assert.equal(merchant.backpack.length, 2);
  assert.equal(merchant.craftsman.backpack.length, LOOT_ITEM_IDS.length);
  assert(backpackSchema.safeParse(merchant.craftsman.backpack).success);
  assert(backpackSchema.safeParse(merchant.backpack).success);
  assert(
    merchant.craftsman.backpack
      .filter((item) => {
        return GEAR_DEFINITIONS[item.itemId];
      })
      .every((item) => {
        return item.rarity && item.stats;
      }),
  );
  const old = { id: 'old', itemId: 'loot-helmet', quantity: 1 };
  assert.deepEqual(backpackSchema.parse([old]), [old]);
  const player = hero();
  player.backpack = [old];
  useBackpackItem(player, old.id);
  assert.equal(characterStats(player).armor, 1);
  assert.equal(itemRarity(player.equipmentItems?.helmet), Rarity.Common);
});

test('semantic validation rejects forged rarity, stat value, class-exclusive stats and equipped mismatches', () => {
  const valid = instance('warrior-sword', ItemStat.AdditionalAttack);
  assert(backpackSchema.safeParse([valid]).success);
  for (const invalid of [
    { ...valid, rarity: 'mythic' },
    { ...valid, rarity: Rarity.Common },
    { ...valid, stats: { ...valid.stats, additionalAttack: 2 } },
    { ...valid, stats: { ...valid.stats, moreProjectiles: 1 } },
    { ...valid, stats: { ...valid.stats, power: Infinity } },
    { ...valid, rarity: Rarity.Legendary, stats: undefined },
    { ...valid, itemId: 'health-potion' },
  ]) {
    assert.equal(backpackSchema.safeParse([invalid]).success, false);
  }

  const player = hero();
  player.equipmentItems = { helmet: valid };
  assert.equal(game.rules.progressSchema.safeParse(player).success, false);
  player.equipmentItems = { weapon: valid };
  player.backpack = [valid];
  assert.equal(game.rules.progressSchema.safeParse(player).success, false);
});
