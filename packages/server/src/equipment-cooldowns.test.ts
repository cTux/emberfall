import { createGame, baseMod } from '@emberfall/core';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  CLASS_IDS,
  learnTalent,
  equipTalent,
  talentNodeId,
  talentAbility,
  talentCooldownMs,
  castTalentAbility,
} from '@emberfall/core';
import { tickPlayerCombat, requestPlayerCast } from '@emberfall/core';

import { hero, scene } from './equipment.fixture.ts';

test('gear recovery applies to attacks and equipped talent casts in training and forest', () => {
  for (const gearSpeed of [-1.5, -0.5, 0, 0.25, 0.5, 1]) {
    const context = createGame([
      baseMod,
      {
        id: 'speed-fixture',
        register(r) {
          r.items.register({
            id: 'speed-ring',
            name: 'Speed ring',
            kind: 'gear',
            gearType: 'ring',
            stats: { attacksPerSecond: gearSpeed },
          });
        },
      },
    ]);
    for (const training of [true, false])
      for (const classId of CLASS_IDS) {
        const player = hero(classId);
        player.level = 20;
        learnTalent(player, talentNodeId(classId, 0, 1));
        equipTalent(player, 0, talentNodeId(classId, 0, 1));
        player.equipment!.ring = 'speed-ring';
        if (!training) player.scene = 'forest';
        else Object.assign(player, { x: 140, y: 340 });
        const arena = scene(training);
        Object.assign(arena.enemies[0], { x: player.x + 20, y: player.y, hitpoints: 100000 });
        const stats = context.rules.characterStats(player);
        const multiplier = 1 + gearSpeed;
        const interval = multiplier > 0 ? 1000 / multiplier : Infinity;
        if (Number.isFinite(interval)) assert(Math.abs(stats.attackIntervalMs - interval) < 1e-9);
        else assert.equal(stats.attackIntervalMs, Infinity);
        assert.equal(context.rules.companionStats(player).attackIntervalMs, stats.attackIntervalMs);
        const ability = talentAbility(player, 0, context)!;
        const cooldown = talentCooldownMs(player, 0, context);
        if (multiplier > 0) assert(Math.abs(cooldown - ability.intervalMs / multiplier) < 1e-9);
        else assert.equal(cooldown, Infinity);
        const request = {
          slot: 0,
          classId,
          epoch: training ? 'lobby' : arena.id,
          aimX: player.x + 20,
          aimY: player.y,
        };
        tickPlayerCombat(arena, [player], 1000, 0, context);
        assert.equal(castTalentAbility(arena, player, request, 1000, context), multiplier > 0);
        if (multiplier <= 0) {
          assert.equal(player.attackAt, undefined);
          assert.equal(player.talentCooldowns, undefined);
          assert.equal(
            requestPlayerCast(
              arena,
              player,
              { ...request, type: 'cast', id: 1, autoTarget: false },
              1000,
              context,
            ),
            false,
          );
          continue;
        }
        tickPlayerCombat(arena, [player], 1000 + stats.attackIntervalMs - 1, 0, context);
        assert.equal(player.attackAt, 1000);
        // Stay within floating-point precision of the fractional cooldown boundary.
        tickPlayerCombat(arena, [player], 1000 + stats.attackIntervalMs + 1e-9, 0, context);
        assert(Math.abs(player.attackAt! - 1000 - stats.attackIntervalMs) < 1e-8);
        assert.equal(
          castTalentAbility(arena, player, request, 1000 + cooldown - 1, context),
          false,
        );
        assert.equal(castTalentAbility(arena, player, request, 1000 + cooldown, context), true);
        if (training) assert.equal(player.experience, 0);
      }
  }
});

test('all class base attacks wait a full second in training and forest', () => {
  for (const training of [true, false]) {
    for (const classId of CLASS_IDS) {
      const player = hero(classId);
      if (!training) player.scene = 'forest';
      else Object.assign(player, { x: 140, y: 340 });
      const arena = scene(training);
      Object.assign(arena.enemies[0], { x: player.x + 20, y: player.y });
      tickPlayerCombat(arena, [player], 1000, 0);
      assert.equal(player.attackAt, 1000);
      tickPlayerCombat(arena, [player], 1999, 0);
      assert.equal(player.attackAt, 1000, `${classId} cannot attack early`);
      tickPlayerCombat(arena, [player], 2000, 0);
      assert.equal(player.attackAt, 2000, `${classId} attacks at the cooldown boundary`);
      if (training) assert.equal(player.experience, 0);
    }
  }
});
