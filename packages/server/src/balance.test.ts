import assert from 'node:assert/strict';
import test from 'node:test';
import { Difficulty, EnemyType, type Enemy, type Player, type SceneState } from '@emberfall/common';

import { createTrainingScene, hitEnemy, stepCombat } from '@emberfall/core';
import { freshProgress } from './characters.ts';

const hero = (): Player => {
  return {
    ...freshProgress(),
    id: 'p',
    name: 'Player',
    color: 0,
    x: 2400,
    y: 1280,
    scene: 'forest',
    autoAttack: false,
  };
};

const scene = (): SceneState => {
  return {
    ...createTrainingScene(0),
    training: false,
    enemies: [],
    nextSpawn: 1e9,
    endsAt: 1e9,
  };
};

const enemy = (kind: EnemyType): Enemy => {
  return {
    id: 20,
    kind,
    x: 2400,
    y: 1280,
    hitpoints: 1,
    angle: 0,
  };
};

test('failed item chance skips count rolls; successful normal chance can still yield zero items', (t) => {
  for (const [type, boundary] of [
    [EnemyType.Normal, 0.04],
    [EnemyType.Elite, 0.15],
    [EnemyType.Boss, 0.5],
  ] as const) {
    const rolls = [0.5, boundary];
    const random = t.mock.method(Math, 'random', () => {
      return rolls.shift()!;
    });
    const arena = scene();
    hitEnemy(arena, enemy(type), 1, hero(), 1000);
    assert.deepEqual(
      arena.drops?.map((drop) => {
        return drop.kind;
      }),
      ['experience'],
    );
    assert.equal(random.mock.callCount(), 2, 'failed gate must not roll a count or item');
    t.mock.restoreAll();
  }

  const rolls = [0.5, 0, 0.01];
  t.mock.method(Math, 'random', () => {
    return rolls.shift()!;
  });
  const arena = scene();
  hitEnemy(arena, enemy(EnemyType.Normal), 1, hero(), 1000);
  assert.deepEqual(
    arena.drops?.map((drop) => {
      return drop.kind;
    }),
    ['experience'],
  );
});

test('a successful 350 percent boss roll drops four independent items once and respects the shared cap', (t) => {
  for (const existing of [0, 512]) {
    const rolls = [
      0.5,
      0.49,
      250.1 / 401,
      0.49,
      0.1,
      0.5,
      0.5,
      0.2,
      0.5,
      0.5,
      0.3,
      0.5,
      0.5,
      0.4,
      0.5,
      0.5,
    ];
    t.mock.method(Math, 'random', () => {
      assert.ok(rolls.length, 'unexpected random roll');

      return rolls.shift()!;
    });
    const arena = scene();
    arena.drops = Array.from({ length: existing }, (_, id) => {
      return {
        id: -id,
        kind: 'experience',
        x: 0,
        y: 0,
        at: 0,
      };
    });
    const boss = enemy(EnemyType.Boss);
    const player = hero();
    hitEnemy(arena, boss, 1, player, 1000);
    hitEnemy(arena, boss, 1, player, 1000);
    assert.equal(
      arena.drops.filter((drop) => {
        return drop.kind === 'item';
      }).length,
      4,
    );
    assert.equal(
      new Set(
        arena.drops
          .filter((drop) => {
            return drop.kind === 'item';
          })
          .map((drop) => {
            return drop.itemId;
          }),
      ).size,
      4,
    );
    assert.equal(arena.drops.length, existing ? 512 : 5);
    assert.equal(player.experience, 1);
    assert.equal(rolls.length, 0);
    t.mock.restoreAll();
  }
});

test('training kills grant no rewards and never roll loot', (t) => {
  t.mock.method(Math, 'random', () => {
    assert.fail('training must not roll loot');
  });
  const arena = createTrainingScene(0);
  const player = hero();
  hitEnemy(arena, arena.enemies[0], 1e9, player, 1000);
  assert.equal(player.experience, 0);
  assert.equal(arena.drops?.length ?? 0, 0);
});

test('enemy projectiles keep type and difficulty damage after their shooter dies', () => {
  const arena = scene();
  arena.difficulty = Difficulty.Hard;
  const player = hero();
  arena.enemies = [
    {
      ...enemy(EnemyType.Elite),
      archetype: 'caster',
      x: player.x - 100,
      hitpoints: 84,
      maxHitpoints: 84,
      attack: {
        startedAt: 9000,
        endsAt: 10000,
        x: player.x,
        y: player.y,
        radius: 22,
        ranged: true,
      },
    },
  ];
  stepCombat(arena, [player], 10000, 0);
  assert.equal(arena.projectiles?.[0].damage, 36);
  arena.enemies = [];
  stepCombat(arena, [player], 10100, 0.5);
  assert.equal(player.hitpoints, 64);
  assert.equal(arena.projectiles?.length, 0);
});
