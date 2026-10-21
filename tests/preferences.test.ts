import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadPreferences } from '../packages/client/src/preferences.ts';
import { clientMessage } from '../packages/core/src/index.ts';

test('auto-loot defaults on and accepts only saved booleans', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    for (const [saved, expected] of [
      ['{}', true],
      ['{"autoLoot":false}', false],
      ['{"autoLoot":true}', true],
      ['{"autoLoot":"false"}', true],
      ['null', true],
      ['invalid', true],
    ] as const) {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: { getItem: () => saved },
      });
      assert.equal(loadPreferences().autoLoot, expected);
    }
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

test('DPS meter defaults on and accepts only saved booleans', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    for (const [saved, expected] of [
      [null, true],
      ['{}', true],
      ['{"dps":false}', false],
      ['{"dps":true}', true],
      ['{"dps":"false"}', true],
      ['{"dps":0}', true],
      ['null', true],
      ['invalid', true],
    ] as const) {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: { getItem: () => saved },
      });
      assert.equal(loadPreferences().dps, expected);
    }
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get: () => {
        throw new Error('Storage unavailable');
      },
    });
    assert.equal(loadPreferences().dps, true);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

test('combat input validates auto-loot and accepts older clients without it', () => {
  const input = {
    type: 'combatInput',
    autoAttack: true,
    autoTarget: true,
    attacking: false,
    aimX: 0,
    aimY: 0,
  };
  assert(clientMessage.safeParse(input).success);
  assert(clientMessage.safeParse({ ...input, autoLoot: false }).success);
  assert(!clientMessage.safeParse({ ...input, autoLoot: 'false' }).success);
});
