import { createGame, baseMod } from '@emberfall/core';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CLASS_IDS, characterStats } from '@emberfall/core';
import {
  tickCompanion,
  stepCombat,
  hitWithWeapon,
  hitEnemy,
  damagePerSecond,
  tickDebuffs,
  tickPlayerShots,
  fireClassAttack,
} from '@emberfall/core';

import { drawDamageNumber, DAMAGE_COLORS } from '../../client/src/damage-text.ts';
import { hero, target, scene } from './equipment.fixture.ts';

test('positive enemy hits have a minimum of one in forest and training without inflating overkill', () => {
  for (const training of [true, false]) {
    const player = hero();
    const arena = scene(training);
    const enemy = arena.enemies[0];
    hitEnemy(arena, enemy, 0, player, 1000);
    assert.equal(arena.damage.length, 0);
    assert.equal(enemy.hitpoints, 100);
    hitEnemy(arena, enemy, 0.2, player, 1000);
    assert.equal(enemy.hitpoints, 99);
    assert.equal(arena.damage[0].amount, 1);
    enemy.hitpoints = 0.2;
    hitEnemy(arena, enemy, 0.1, player, 1001);
    assert.equal(enemy.hitpoints, 0);
    assert.equal(arena.damage[1].amount, 0.2);
    assert.equal(damagePerSecond(player, 1001), 1.2 / 5);
    hitEnemy(arena, enemy, 1, player, 1002);
    assert.equal(arena.damage.length, 2);
  }
});

test('armor cannot reduce incoming player or Bear damage below one', () => {
  const context = createGame([
    baseMod,
    {
      id: 'minimum-damage-test',
      register(r) {
        r.items.register({
          id: 'minimum-damage-ring',
          kind: 'gear',
          name: 'Armor ring',
          gearType: 'ring',
          stats: { armor: 10000 },
        });
      },
    },
  ]);
  for (const bear of [false, true]) {
    const player = hero(bear ? 'druid' : 'warrior');
    player.scene = 'forest';
    player.autoAttack = false;
    player.equipment!.ring = 'minimum-damage-ring';
    const arena = scene(false);
    if (bear) tickCompanion(player, arena, 1000, 0, context);
    const target = bear ? player.bear! : player;
    if (bear) target.x = player.x - 100;
    const enemy = arena.enemies[0];
    enemy.x = target.x;
    enemy.attack = {
      startedAt: 1000,
      endsAt: 2000,
      x: target.x,
      y: target.y,
      radius: 100,
      ranged: false,
    };
    const before = target.hitpoints;
    stepCombat(arena, [player], 2000, 0, context);
    assert.equal(target.hitpoints, before - 1);
    assert.equal(arena.damage.at(-1)!.amount, 1);
    assert.equal(arena.damage.at(-1)!.target, target.id);
  }
});

test('critical boundary is exactly five percent, with fractional 150% power in both areas', (t) => {
  for (const training of [true, false])
    for (const classId of CLASS_IDS) {
      const player = hero(classId);
      for (const roll of [0, 0.049999, 0.05, 0.99]) {
        const random = t.mock.method(Math, 'random', () => roll);
        const arena = scene(training);
        hitWithWeapon(arena, arena.enemies[0], player, 1000);
        const hit = arena.damage[0];
        assert.equal(hit.critical, roll < 0.05);
        assert.equal(hit.amount, characterStats(player).power * (roll < 0.05 ? 1.5 : 1));
        assert.equal(hit.damageType, characterStats(player).damageType);
        if (training) assert.equal(player.experience, 0);
        random.mock.restore();
      }
    }
});

test('projectile and splash hits carry weapon metadata; ailments never critically hit', (t) => {
  t.mock.method(Math, 'random', () => 0);
  for (const classId of ['ranger', 'mage', 'druid'] as const) {
    const player = hero(classId);
    const arena = scene();
    arena.enemies.push({ ...target(), id: 2, y: 1310 });
    fireClassAttack(arena, player, 1000);
    tickPlayerShots(arena, [player], 1050, 0.05);
    assert(arena.damage.length > 0);
    assert(
      arena.damage.every(
        (hit) =>
          hit.ownerId === player.id &&
          hit.critical &&
          hit.damageType === characterStats(player).damageType,
      ),
    );
    if (classId === 'mage') assert(arena.damage.some((hit) => hit.amount === 1.5));
    const before = arena.damage.length;
    tickDebuffs(arena, [player], 2050);
    assert(arena.damage.slice(before).every((hit) => hit.critical === false));
  }
});

test('damage text uses type colors, with white fill over a thick red critical outline', () => {
  const calls: { operation: string; color: unknown; width?: number }[] = [];
  const ctx = {
    globalAlpha: 1,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    save() {},
    restore() {},
    translate() {},
    scale() {},
    fillText(this: CanvasRenderingContext2D) {
      calls.push({ operation: 'fill', color: this.fillStyle });
    },
    strokeText(this: CanvasRenderingContext2D) {
      calls.push({ operation: 'stroke', color: this.strokeStyle, width: this.lineWidth });
    },
  } as unknown as CanvasRenderingContext2D;
  for (const damageType of ['physical', 'fire', 'poison', 'nature'] as const) {
    const hit = { id: 1, amount: 4.5, x: 0, y: 0, at: 1000, target: 'enemy:1', damageType };
    calls.length = 0;
    drawDamageNumber(ctx, hit, { x: 0, y: 0 }, 1000);
    assert.deepEqual(calls, [
      { operation: 'stroke', color: '#20150f', width: 3 },
      { operation: 'fill', color: DAMAGE_COLORS[damageType] },
    ]);
    calls.length = 0;
    drawDamageNumber(ctx, { ...hit, critical: true }, { x: 0, y: 0 }, 1000);
    assert.deepEqual(calls, [
      { operation: 'stroke', color: '#20150f', width: 7 },
      { operation: 'stroke', color: '#d52b3f', width: 4 },
      { operation: 'fill', color: '#ffffff' },
    ]);
  }
});
