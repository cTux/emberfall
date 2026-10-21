import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame } from '../create-game.ts';
import { baseMod } from '../../mods/base.mod.ts';
import { extensionMod } from './fixture.ts';
import type { GameMod, Registration, AbilityDefinition } from '../contracts.ts';
import { game } from '../../game.ts';
import type { Player } from '@emberfall/common';

const compose = (mod: GameMod) => createGame([baseMod, mod]);
test('base loads through the same registries with stable IDs, ordering and balance', () => {
  const ready = createGame([baseMod]);
  assert.equal(ready.status, 'ready');
  assert.deepEqual(ready.modIds, ['base']);
  assert.deepEqual(
    ready.registries.classes.values().map((player) => player.id),
    ['warrior', 'ranger', 'mage', 'druid'],
  );
  assert.equal(ready.registries.items.size, 16);
  assert.equal(ready.rules.characterStats({ classId: 'warrior' }).power, 5);
  assert.equal(ready.registries.enemies.require('caster').hitPoints, 7);
  assert.equal(ready.registries.enemyTypes.require('normal').dropCount, 1);
  assert.equal(ready.registries.abilities.require('roots').count, 1);
});
test('registration resolves forward references, isolates instances and drives item/slot/stat rules', () => {
  const ready = compose(extensionMod),
    other = createGame([baseMod]);
  assert.equal(other.registries.classes.has('fixture:scout'), false);
  assert.equal(ready.rules.classSchema.safeParse('fixture:scout').success, true);
  assert.equal(other.rules.classSchema.safeParse('fixture:scout').success, false);
  const player: Player = {
    id: 'p',
    name: 'Hero',
    classId: 'fixture:scout',
    x: 0,
    y: 0,
    color: 0,
    level: 1,
    experience: 0,
    hitpoints: 100,
    maxHitpoints: 100,
    playtimeSeconds: 0,
    equipment: { weapon: 'ranger-bow' },
    backpack: [{ id: 'charm', itemId: 'fixture:charm', quantity: 1 }],
  };
  ready.rules.useBackpackItem(player, 'charm');
  assert.equal(player.equipment!['fixture:charm'], 'fixture:charm');
  assert.equal(
    ready.rules.validateClassEquipment(player.equipment!, 'fixture:scout')['fixture:charm'],
    'fixture:charm',
  );
  const stats = ready.rules.characterStats(player);
  assert.equal(stats.attributes['fixture:luck'], 9);
  assert.equal(stats.armor, 10);
  assert.equal(
    ready.rules.clientMessage.safeParse({ type: 'unequip', slot: 'fixture:charm' }).success,
    true,
  );
  assert.equal(
    other.rules.clientMessage.safeParse({ type: 'unequip', slot: 'fixture:charm' }).success,
    false,
  );
  ready.rules.unequipItem(player, 'fixture:charm');
  assert.equal(ready.rules.characterStats(player).attributes['fixture:luck'], 2);
  assert.equal(player.backpack![0].itemId, 'fixture:charm');
  player.storages = ready.rules.freshStorages();
  ready.rules.transferStoredItem(player, 0, player.backpack![0].id, true);
  assert.equal(player.storages[0].items[0].itemId, 'fixture:charm');
  ready.rules.transferStoredItem(player, 0, player.storages[0].items[0].id, false);
  player.coins = 10;
  const merchant = ready.rules.freshMerchant();
  ready.rules.tradeItem(player, merchant, player.backpack![0].id, false);
  assert.equal(player.coins, 14);
  ready.rules.tradeItem(player, merchant, merchant.buyback[0].id, true);
  assert.equal(player.coins, 10);
  assert.equal(player.backpack![0].itemId, 'fixture:charm');

  assert.equal(
    ready.rules.backpackSchema.safeParse([{ id: 'p', itemId: 'fixture:charm', quantity: 2 }])
      .success,
    false,
  );
});
test('ready content is detached and deeply immutable; retained registration handles are closed', () => {
  let registration!: Registration;
  const stats = { armor: 3 };
  const ready = compose({
    id: 'retained',
    register(r) {
      registration = r;
      r.items.register({
        id: 'retained:ring',
        name: 'Ring',
        kind: 'gear',
        gearType: 'ring',
        stats,
      });
    },
  });
  stats.armor = 99;
  const item = ready.registries.items.require('retained:ring');
  assert.equal(item.kind, 'gear');
  if (item.kind !== 'gear') throw new Error('Expected gear');
  assert.equal(item.stats.armor, 3);
  assert.throws(() => {
    item.stats.armor = 5;
  }, TypeError);
  assert.throws(
    () =>
      registration.stats.register({
        id: 'late',
        label: 'Late',
        default: 0,
        aggregation: 'sum',
        format: 'number',
      }),
    /after initialization/,
  );
  assert.equal('register' in ready.registries.items, false);
});
test('duplicates, bad references, values and unsupported mechanics fail with mod context', () => {
  assert.throws(
    () =>
      compose({
        id: 'fractional-price',
        register(r) {
          r.items.register({
            id: 'fractional-price:potion',
            name: 'Potion',
            kind: 'consumable',
            healing: 10,
            price: 0.5,
          });
        },
      }),
    /fractional-price.*price/s,
  );
  assert.throws(() => createGame([baseMod, baseMod]), /mod ID 'base'/);
  assert.throws(
    () =>
      compose({
        id: 'duplicate',
        register(r) {
          r.items.register({ ...game.registries.items.require('warrior-sword') });
        },
      }),
    /duplicate.*items 'warrior-sword'.*duplicate ID/,
  );
  assert.throws(
    () =>
      compose({
        id: 'missing',
        register(r) {
          r.items.register({
            id: 'missing:item',
            name: 'Broken',
            kind: 'gear',
            gearType: 'ring',
            stats: { missing: 1 },
          });
        },
      }),
    /missing.*items 'missing:item'.*stats.*missing/,
  );
  assert.throws(
    () =>
      compose({
        id: 'nan',
        register(r) {
          r.stats.register({
            id: 'nan:stat',
            label: 'NaN',
            default: NaN,
            aggregation: 'sum',
            format: 'number',
          });
        },
      }),
    /nan.*finite/,
  );
  assert.throws(
    () =>
      compose({
        id: 'negative',
        register(r) {
          r.abilities.register({
            ...game.registries.abilities.require('arrow'),
            id: 'negative:ability',
            speed: -1,
          });
        },
      }),
    /negative.*abilities.*speed/s,
  );
  assert.throws(
    () =>
      compose({
        id: 'unsupported',
        register(r) {
          r.abilities.register({
            ...game.registries.abilities.require('arrow'),
            id: 'unsupported:ability',
            kind: 'laser',
          } as unknown as AbilityDefinition);
        },
      }),
    /unsupported.*abilities.*kind/s,
  );
  let retained!: Registration;
  assert.throws(
    () =>
      compose({
        id: 'failed',
        register(r) {
          retained = r;
          r.classes.register({
            ...game.registries.classes.require('mage'),
            id: 'failed:class',
            attack: 'missing',
          });
        },
      }),
    /failed.*classes.*abilities.*missing/,
  );
  assert.throws(
    () =>
      retained.stats.register({
        id: 'late',
        label: 'Late',
        default: 0,
        aggregation: 'sum',
        format: 'number',
      }),
    /after initialization/,
  );
});
