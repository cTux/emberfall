import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadPreferences } from '../packages/client/src/preferences.ts';
import { clientMessage } from '../packages/core/src/index.ts';

test('font preferences accept only bundled families and preserve legacy defaults', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    for (const font of [
      'Alegreya Sans',
      'Inter',
      'Source Sans 3',
      'Atkinson Hyperlegible Next',
      'unknown',
      '__proto__',
      123,
      null,
    ]) {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: { getItem: () => JSON.stringify({ font }) },
      });
      assert.equal(
        loadPreferences().font,
        typeof font === 'string' &&
          ['Inter', 'Source Sans 3', 'Atkinson Hyperlegible Next'].includes(font)
          ? font
          : 'Alegreya Sans',
      );
    }
    for (const saved of ['{}', 'null', 'invalid']) {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: { getItem: () => saved },
      });
      assert.equal(loadPreferences().font, 'Alegreya Sans');
    }
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

for (const key of ['autoLoot', 'hideGatheringHintInCombat'] as const)
  test(`${key} defaults on and accepts only saved booleans`, () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    try {
      for (const [saved, expected] of [
        ['{}', true],
        [JSON.stringify({ [key]: false }), false],
        [JSON.stringify({ [key]: true }), true],
        [JSON.stringify({ [key]: 'false' }), true],
        ['null', true],
        ['invalid', true],
      ] as const) {
        Object.defineProperty(globalThis, 'localStorage', {
          configurable: true,
          value: { getItem: () => saved },
        });
        assert.equal(loadPreferences()[key], expected);
      }
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original);
      else Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });

for (const key of ['dps', 'fps', 'latency'] as const) {
  test(`${key} defaults off and accepts only saved booleans`, () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    try {
      for (const [saved, expected] of [
        [null, false],
        ['{}', false],
        [JSON.stringify({ [key]: false }), false],
        [JSON.stringify({ [key]: true }), true],
        [JSON.stringify({ [key]: 'true' }), false],
        [JSON.stringify({ [key]: 1 }), false],
        ['null', false],
        ['invalid', false],
      ] as const) {
        Object.defineProperty(globalThis, 'localStorage', {
          configurable: true,
          value: { getItem: () => saved },
        });
        assert.equal(loadPreferences()[key], expected);
      }
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        get: () => {
          throw new Error('Storage unavailable');
        },
      });
      assert.equal(loadPreferences()[key], false);
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original);
      else Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });
}

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

test('custom cursor preferences accept only supported sizes and booleans', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    for (const [saved, enabled, size] of [
      ['{}', true, 48],
      ['{"customCursor":false,"cursorSize":32}', false, 32],
      ['{"customCursor":true,"cursorSize":64}', true, 64],
      ['{"customCursor":"false","cursorSize":"64"}', true, 48],
      ['{"cursorSize":128}', true, 48],
      ['{"cursorSize":null}', true, 48],
      ['null', true, 48],
      ['invalid', true, 48],
    ] as const) {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: { getItem: () => saved },
      });
      const preferences = loadPreferences();
      assert.equal(preferences.customCursor, enabled);
      assert.equal(preferences.cursorSize, size);
    }
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get: () => {
        throw new Error('Storage unavailable');
      },
    });
    assert.equal(loadPreferences().customCursor, true);
    assert.equal(loadPreferences().cursorSize, 48);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
