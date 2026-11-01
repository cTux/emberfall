import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENEMY_STATS, stepCombat, dimensionDefinition } from '@emberfall/core';
import { hero, scene } from './classes.fixture.ts';

for (const [dimension, archetype, count] of [
  ['desert', 'sandWisp', 3],
  ['desert', 'duneColossus', 8],
] as const) {
  test(`${archetype} releases its configured volley with scaled range, timing, speed and damage`, () => {
    const player = hero();
    player.autoAttack = false;
    const run = scene();
    run.dimension = dimension;
    const scale = dimensionDefinition(dimension).enemyMultiplier;
    const stats = ENEMY_STATS[archetype];
    run.enemies = [
      {
        id: 1,
        archetype,
        x: player.x - stats.reach * scale + 1,
        y: player.y,
        hitpoints: 100,
        angle: 0,
      },
    ];
    stepCombat(run, [player], 10000, 0);
    const attack = run.enemies[0].attack!;
    assert.ok(attack.ranged);
    assert.equal(attack.endsAt, 10000 + stats.windup / scale);
    stepCombat(run, [player], attack.endsAt, 0);
    assert.equal(run.projectiles!.length, count);
    assert.equal(run.projectiles![0].damage, stats.damage * scale);
    assert.ok(
      Math.abs(Math.hypot(run.projectiles![0].vx, run.projectiles![0].vy) - 210 * scale) < 0.00001,
    );
    assert.equal(
      new Set(
        run.projectiles!.map((shot) => {
          return Math.atan2(shot.vy, shot.vx);
        }),
      ).size,
      count,
    );
  });
}

for (const archetype of ['mireling', 'bogToad', 'mossGolem'] as const) {
  test(`${archetype} ground ability hits only the marked area, including wrapped targets`, () => {
    const player = hero();
    player.x = 5;
    player.autoAttack = false;
    const run = scene();
    run.dimension = 'swamp';
    const stats = ENEMY_STATS[archetype];
    const skill = stats.skill!;
    assert.equal(skill.kind, 'ground');
    run.enemies = [{ id: 1, archetype, x: 4790, y: player.y, hitpoints: 100, angle: 0 }];
    stepCombat(run, [player], 10000, 0);
    const attack = run.enemies[0].attack!;
    assert.equal(attack.ranged, false);
    assert.equal(attack.radius, skill.kind === 'ground' ? skill.radius * 1.2 : 0);
    stepCombat(run, [player], attack.endsAt, 0);
    assert.equal(player.hitpoints, 100 - stats.damage * 1.2);
    run.enemies[0].cooldownUntil = 0;
    stepCombat(run, [player], 20000, 0);
    const next = run.enemies[0].attack!;
    player.y += 500;
    stepCombat(run, [player], next.endsAt, 0);
    assert.equal(
      player.hitpoints,
      100 - stats.damage * 1.2,
      'escaping the telegraph avoids damage',
    );
  });
}
