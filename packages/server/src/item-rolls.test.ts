import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { BackpackItem, Player, SceneState, Enemy } from '@emberfall/common';
import {
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
  unequipItem,
  transferStoredItem,
  moveStorageItem,
  freshMerchant,
  tradeItem,
  sellAll,
  backpackSchema,
  game,
  createTrainingScene,
  movePlayer,
  hitWithWeapon,
  hitEnemy,
  setRewardPlayers,
  tickPlayerShots,
  fireClassAttack,
  effectiveAbility,
  talentAbility,
  learnTalent,
  equipTalent,
  talentNodeId,
  castTalentAbility,
  talentCooldownMs,
  FOREST,
} from '@emberfall/core';
import { executeTalent } from '../../core/src/talent-effects.ts';
import { CharacterStore, freshProgress, decodeProgress } from './characters.ts';

const hero = (classId = 'warrior', id = 'hero'): Player => ({
  ...freshProgress(classId),
  classId,
  id,
  name: id,
  x: 2400,
  y: 1280,
  color: 0,
  level: 20,
  scene: 'forest',
  autoTarget: false,
  aimX: 3000,
  aimY: 1280,
});
function instance(itemId: string, stat: ItemStat, rarity: Rarity = Rarity.Legendary): BackpackItem {
  const stats: Record<string, number> = {};
  const pool = [stat, ...itemTypeStats[GEAR_DEFINITIONS[itemId].gearType]];
  for (const key of pool) {
    if (Object.keys(stats).length === rarityStatCount[rarity]) break;
    if (rarity !== Rarity.Legendary && itemStatWeight[key] < 1) continue;
    stats[key] = statValue(key, rarity);
  }
  return { id: crypto.randomUUID(), itemId, quantity: 1, rarity, stats };
}
function equip(player: Player, slot: string, itemId: string, stat: ItemStat) {
  const item = instance(itemId, stat);
  player.equipment = { ...player.equipment, [slot]: itemId };
  player.equipmentItems = { ...player.equipmentItems, [slot]: item };
  return item;
}
const arena = (training = true): SceneState => ({
  ...createTrainingScene(0),
  id: 'arena',
  training,
  nextSpawn: 1e9,
  endsAt: 1e9,
  enemies: [],
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
  ] as const)
    assert.equal(
      rollRarity(() => percent / 100),
      rarity,
    );
  assert.equal(itemRarity(), Rarity.Common);
  assert.equal(new Set(Object.values(rarityColor)).size, 5);
});

test('all gear pools include reward stats, distinct configured values and restricted low-weight legendary stats', () => {
  for (const [type, pool] of Object.entries(itemTypeStats)) {
    assert(pool.includes(ItemStat.GoldIncrease));
    assert(pool.includes(ItemStat.ExpIncrease));
    for (const rarity of Object.values(Rarity)) {
      for (const roll of [0, 0.3, 0.99999]) {
        const stats = rollItemStats(type, rarity, () => roll);
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
  for (let index = 0; index < 820; index++)
    if (
      ItemStat.AdditionalAttack in
      rollItemStats('sword', Rarity.Legendary, () => (index + 0.5) / 820)
    )
      specials++;
  assert(
    specials > 0 && specials < 820 / 3,
    'special is possible but substantially less likely than normal rolls',
  );
});

test('every generated loot and merchant gear item validates; old items remain untouched Common', () => {
  for (const id of LOOT_ITEM_IDS) assert(backpackSchema.safeParse([rollItem(id)]).success);
  const merchant = freshMerchant();
  assert.equal(merchant.backpack.length, 2 + LOOT_ITEM_IDS.length);
  assert(backpackSchema.safeParse(merchant.backpack).success);
  assert(
    merchant.backpack
      .filter((item) => GEAR_DEFINITIONS[item.itemId])
      .every((item) => item.rarity && item.stats),
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
  ])
    assert.equal(backpackSchema.safeParse([invalid]).success, false);
  const player = hero();
  player.equipmentItems = { helmet: valid };
  assert.equal(game.rules.progressSchema.safeParse(player).success, false);
  player.equipmentItems = { weapon: valid };
  player.backpack = [valid];
  assert.equal(game.rules.progressSchema.safeParse(player).success, false);
});

test('exact rolls survive equip replacement, storage, sale, buyback, class switches and SQLite restart', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'emberfall-rolls-'));
  const path = join(directory, 'save.sqlite');
  let store = new CharacterStore(path);
  await store.ready;
  try {
    const saved = store.create('Roll owner');
    const player = { ...hero(), ...saved.progress, id: saved.id, name: saved.name };
    const item = instance('warrior-sword', ItemStat.AdditionalAttack);
    player.backpack = [item];
    useBackpackItem(player, item.id);
    assert.deepEqual(player.equipmentItems!.weapon, item);
    const replacement = instance('warrior-sword', ItemStat.CriticalChance, Rarity.Uncommon);
    player.backpack!.push(replacement);
    useBackpackItem(player, replacement.id);
    assert.deepEqual(
      player.backpack!.find((entry) => entry.id === item.id),
      item,
    );
    transferStoredItem(player, 0, item.id, true);
    moveStorageItem(player, 0, 1, item.id);
    transferStoredItem(player, 1, item.id, false);
    player.coins = 100;
    const world = { id: crypto.randomUUID(), name: 'Roll world', salt: '' };
    store.saveWorld(world, true);
    const merchant = freshMerchant();
    tradeItem(player, merchant, item.id, false);
    assert.deepEqual(merchant.buyback[0].stats, item.stats);
    tradeItem(player, merchant, merchant.buyback[0].id, true);
    assert.deepEqual(player.backpack!.at(-1)!.stats, item.stats);
    unequipItem(player, 'weapon');
    useBackpackItem(
      player,
      player.backpack!.find((entry) => entry.rarity === Rarity.Legendary)!.id,
    );
    sellAll(player, merchant);
    assert.deepEqual(player.equipmentItems!.weapon.stats, item.stats);
    store.save(saved.id, saved.name, player, { worldId: world.id, state: merchant });
    store.selectClass(saved.id, player, 'mage');
    assert.equal(
      player.equipmentItems,
      undefined,
      'previous class rolls cannot leak into another class',
    );
    store.selectClass(saved.id, player, 'warrior');
    assert.deepEqual(player.equipmentItems!.weapon.stats, item.stats);
    store.close();
    store = new CharacterStore(path);
    await store.ready;
    const reloaded = store.load(saved.token)!;
    assert.deepEqual(reloaded.progress.equipmentItems!.weapon.stats, item.stats);
    assert.deepEqual(store.merchant(world.id).buyback, merchant.buyback);
    assert.deepEqual(
      decodeProgress(JSON.stringify(reloaded.progress)).progress.equipmentItems,
      reloaded.progress.equipmentItems,
    );
  } finally {
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('flat and percentage bonuses sum across equipment with exact fractional attack speed and cooldown recovery', () => {
  const player = hero();
  equip(player, 'weapon', 'warrior-sword', ItemStat.Power);
  equip(player, 'offHand', 'loot-shield', ItemStat.Armor);
  equip(player, 'helmet', 'loot-helmet', ItemStat.MaximumHealth);
  const ring = instance('loot-ring', ItemStat.AttackSpeed, Rarity.Uncommon);
  player.equipment!.ring = ring.itemId;
  player.equipmentItems!.ring = ring;
  const stats = characterStats(player);
  assert.equal(stats.power, 9);
  assert.equal(stats.armor, 7);
  assert.equal(stats.maxHitpoints, 120);
  assert.equal(stats.attacksPerSecond, 1.064);
  assert.equal(stats.attackIntervalMs, 1000 / 1.064);
  assert.equal(talentCooldownMs(player, 0), 6000 / 1.064);
});

test('movement, range and melee area bonuses affect actual shared movement and targeting', (t) => {
  t.mock.method(Math, 'random', () => 0.5);
  const player = hero();
  equip(player, 'boots', 'loot-boots', ItemStat.MovementSpeed);
  const plain = hero();
  movePlayer(plain, 1, 0, 0.1);
  movePlayer(player, 1, 0, 0.1);
  assert(Math.abs((player.x - 2400) / (plain.x - 2400) - 1.06) < 1e-10);
  const mage = hero('mage');
  equip(mage, 'weapon', 'mage-staff', ItemStat.Range);
  const scene = arena();
  fireClassAttack(scene, mage);
  assert.equal(scene.playerShots![0].remaining, 1200);
  assert.equal(characterStats(mage).range, 300);
  assert.equal(
    effectiveAbility(mage, game.registries.abilities.require('fireball')).manualRange,
    1200,
  );
});

test('legendary weapon and off-hand effects stack; extra warrior attacks independently crit and trigger on-hit effects', (t) => {
  const player = hero();
  equip(player, 'weapon', 'warrior-sword', ItemStat.AdditionalAttack);
  equip(player, 'offHand', 'loot-shield', ItemStat.AdditionalAttack);
  const scene = arena();
  const enemy: Enemy = { id: 1, x: 2420, y: 1280, hitpoints: 1000, angle: 0 };
  const rolls = [0, 0.5, 0.5, 0, 0.5, 0.5];
  t.mock.method(Math, 'random', () => rolls.shift() ?? 0.5);
  hitWithWeapon(scene, enemy, player, 1000, 'bleed');
  assert.equal(scene.damage.length, 3);
  assert(scene.damage.some((hit) => hit.critical));
  assert(scene.damage.some((hit) => !hit.critical));
  assert.equal(enemy.debuffs?.length, 1);
});

test('hunter base arrows stop after four hits; two legendary pierce bonuses allow six across the seam', (t) => {
  t.mock.method(Math, 'random', () => 0.5);
  for (const bonus of [false, true]) {
    const player = hero('ranger');
    player.x = FOREST.width - 100;
    if (bonus) {
      equip(player, 'weapon', 'ranger-bow', ItemStat.ProjectilePierce);
      equip(player, 'offHand', 'loot-quiver', ItemStat.ProjectilePierce);
    }
    const scene = arena(false);
    scene.enemies = Array.from({ length: 7 }, (_, index) => ({
      id: index + 1,
      x: (player.x + 40 + index * 45) % FOREST.width,
      y: player.y + 12,
      hitpoints: 100,
      angle: 0,
    }));
    scene.playerShots = [
      {
        id: 1,
        ownerId: player.id,
        kind: 'arrow',
        x: player.x,
        y: player.y,
        angle: 0,
        remaining: 1000,
        hitIds: [],
      },
    ];
    tickPlayerShots(scene, [player], 1000, 1);
    assert.equal(scene.damage.length, bonus ? 6 : 4);
    assert.equal(scene.playerShots.length, 0);
  }
});

test('mage projectile counts, splash radii and druid bounce limits consume their equipped configs', () => {
  const mage = hero('mage');
  equip(mage, 'weapon', 'mage-staff', ItemStat.MoreProjectiles);
  equip(mage, 'offHand', 'loot-orb', ItemStat.MoreProjectiles);
  equip(mage, 'amulet', 'loot-amulet', ItemStat.AreaOfEffect);
  const scene = arena();
  fireClassAttack(scene, mage);
  assert.equal(scene.playerShots!.length, 4);
  assert.equal(
    effectiveAbility(mage, game.registries.abilities.require('fireball')).splashRadius,
    120,
  );
  const druid = hero('druid');
  equip(druid, 'weapon', 'druid-staff', ItemStat.ProjectilesBounce);
  equip(druid, 'offHand', 'loot-natureFocus', ItemStat.ProjectilesBounce);
  assert.equal(effectiveAbility(druid, game.registries.abilities.require('roots')).bounces, 5);
  assert.equal(effectiveAbility(druid, talentAbility(druid, 1)!).bounces, 5);
});

test('compatible offensive talents repeat attacks and extend pierces/bounces, and scale area/range', (t) => {
  t.mock.method(Math, 'random', () => 0.5);
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
    if (classId === 'ranger' || classId === 'druid')
      assert.equal(scene.damage[1].target, 'enemy:2');
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
    t.mock.method(Math, 'random', () => values.shift() ?? 0.99);
    const target = { id: 1, x: 2400, y: 1280, hitpoints: 1, angle: 0 };
    hitEnemy(scene, target, 1, killer, 1000);
    assert.equal(scene.drops!.filter((drop) => drop.kind === 'gold').length, expectedGold);
    assert.equal(scene.drops!.filter((drop) => drop.kind === 'experience').length, expectedXp);
    hitEnemy(scene, target, 1, killer, 1000);
    assert.equal(scene.drops!.length, expectedGold + expectedXp);
    t.mock.restoreAll();
  }
  const scene = arena();
  setRewardPlayers(scene, [killer, member]);
  hitEnemy(scene, { id: 1, x: 2400, y: 1280, hitpoints: 1, angle: 0 }, 1, killer, 1000);
  assert.equal(scene.drops?.length ?? 0, 0);
});
