import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createGame,
  GAME_MODS,
  difficultyRarityMultiplier,
  zoneRarityMultiplier,
  rollRarity,
  hitEnemy,
} from '@emberfall/core';
import { arena, hero } from './item-rolls.fixture.ts';

test('zone and difficulty maps expose the requested rarity factors', () => {
  assert.deepEqual(zoneRarityMultiplier, { Forest: 1 });
  assert.deepEqual(difficultyRarityMultiplier, { Easy: 1, Medium: 1.5, Hard: 2 });
});

test('rarity factors scale every non-Common interval and leave Common as the remainder', () => {
  for (const multiplier of [1, 1.5, 2, 3]) {
    for (const [percent, rarity] of [
      [0, 'legendary'],
      [0.00999, 'legendary'],
      [0.01001, 'epic'],
      [0.10999, 'epic'],
      [0.11001, 'rare'],
      [1.10999, 'rare'],
      [1.11001, 'uncommon'],
      [11.10999, 'uncommon'],
      [11.11001, 'common'],
    ] as const) {
      assert.equal(
        rollRarity(() => {
          return (percent * multiplier) / 100;
        }, multiplier),
        rarity,
      );
    }

    assert.equal(
      rollRarity(() => {
        return 0.999999;
      }, multiplier),
      'common',
    );
  }
});

test('authoritative Forest kills apply scene difficulty while ordinary gear rolls keep base odds', () => {
  for (const [difficulty, expected] of [
    ['Easy', 'common'],
    ['Medium', 'uncommon'],
    ['Hard', 'uncommon'],
  ] as const) {
    // Gold fails, boss gate succeeds, count is one, gear selection is first, rarity is 15%.
    const draws = [0.9, 0, 0, 0, 0.15];
    const context = createGame(GAME_MODS, () => {
      return draws.shift() ?? 0.15;
    });
    const scene = arena(false);
    scene.difficulty = difficulty;
    const enemy = { id: 1, x: 100, y: 100, angle: 0, hitpoints: 1, kind: 'boss' as const };
    hitEnemy(
      scene,
      enemy,
      1,
      hero(),
      1000,
      undefined,
      'physical',
      false,
      'Attack',
      undefined,
      context,
    );
    const gear = scene.drops!.filter((drop) => {
      return drop.kind === 'item';
    });
    assert.equal(gear.length, 1);
    assert.equal(gear[0].rarity, expected);
    assert.equal(context.rules.rollItem('warrior-sword').rarity, 'common');
    assert.equal(
      context.rules.backpackSchema.safeParse([
        context.rules.rollItem('warrior-sword', undefined, 2),
      ]).success,
      true,
    );
  }
});
