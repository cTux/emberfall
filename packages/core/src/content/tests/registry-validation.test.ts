import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame } from '../create-game.ts';
import { baseMod } from '../../mods/base.mod.ts';

import type { Registration, AbilityDefinition } from '../contracts.ts';
import { game } from '../../game.ts';

import { worldShapes } from '../shapes.ts';
import { VILLAGE_DEFINITION } from '../../mods/base/worlds/village.ts';
import { compose } from './registries.fixture.ts';

test('duplicates, bad references, values and unsupported mechanics fail with mod context', () => {
  assert.throws(() => {
    return compose({
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
    });
  }, /fractional-price.*price/s);
  assert.throws(() => {
    return createGame([baseMod, baseMod]);
  }, /mod ID 'base'/);
  assert.throws(() => {
    return compose({
      id: 'duplicate',
      register(r) {
        r.items.register({ ...game.registries.items.require('warrior-sword') });
      },
    });
  }, /duplicate.*items 'warrior-sword'.*duplicate ID/);
  assert.throws(() => {
    return compose({
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
    });
  }, /missing.*items 'missing:item'.*stats.*missing/);
  assert.throws(() => {
    return compose({
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
    });
  }, /nan.*finite/);
  assert.throws(() => {
    return compose({
      id: 'negative',
      register(r) {
        r.abilities.register({
          ...game.registries.abilities.require('arrow'),
          id: 'negative:ability',
          speed: -1,
        });
      },
    });
  }, /negative.*abilities.*speed/s);
  assert.throws(() => {
    return compose({
      id: 'unsupported',
      register(r) {
        r.abilities.register({
          ...game.registries.abilities.require('arrow'),
          id: 'unsupported:ability',
          kind: 'laser',
        } as unknown as AbilityDefinition);
      },
    });
  }, /unsupported.*abilities.*kind/s);
  let retained!: Registration;
  assert.throws(() => {
    return compose({
      id: 'failed',
      register(r) {
        retained = r;
        r.classes.register({
          ...game.registries.classes.require('mage'),
          id: 'failed:class',
          attack: 'missing',
        });
      },
    });
  }, /failed.*classes.*abilities.*missing/);
  assert.throws(() => {
    return retained.stats.register({
      id: 'late',
      label: 'Late',
      default: 0,
      aggregation: 'sum',
      format: 'number',
    });
  }, /after initialization/);
});

test('talent ability metadata rejects unknown classes, partial slots and duplicate slots', () => {
  const ability = game.registries.abilities.require('talent:mage:0');
  for (const [change, message] of [
    [{ classId: 'missing' }, /unknown classes reference/],
    [{ classId: undefined }, /class and slot must be specified together/],
    [{ classId: 'mage' }, /duplicate talent class\/slot/],
  ] as const) {
    assert.throws(() => {
      return compose({
        id: 'bad-talent',
        register(r) {
          const invalid = { ...ability, ...change, id: 'bad-talent:ability' };
          if (invalid.classId === undefined) {
            delete invalid.classId;
          }

          r.abilities.register(invalid);
        },
      });
    }, message);
  }
});

test('workstation content rejects unknown owners, wrong homes, duplicate IDs and unsupported art', () => {
  const valid = structuredClone(VILLAGE_DEFINITION);
  assert(worldShapes.village.safeParse(valid).success);
  for (const patch of [
    { npcId: 'missing' },
    { buildingId: 'hall' },
    { art: 8 },
    { activity: 'missing' },
    { x: NaN },
  ]) {
    const invalid = {
      ...valid,
      workstations: valid.workstations.map((station, i) => {
        return i === 0 ? { ...station, ...patch } : station;
      }),
    };
    assert.equal(worldShapes.village.safeParse(invalid).success, false);
  }

  assert.equal(
    worldShapes.village.safeParse({ ...valid, workstations: valid.workstations.slice(1) }).success,
    false,
  );
  assert.equal(
    worldShapes.village.safeParse({
      ...valid,
      workstations: [valid.workstations[0], valid.workstations[0], ...valid.workstations.slice(2)],
    }).success,
    false,
  );
});
