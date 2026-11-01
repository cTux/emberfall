import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createTrainingScene,
  tickTraining,
  tickCompanion,
  game,
  ENEMY_STATS,
  freshMerchant,
} from '@emberfall/core';
import { applyHealing, refreshCombatTotals } from '../../core/src/combat/meters.ts';
import { heal, shield } from '../../core/src/talents/effects.ts';
import { tickEnemyCombat } from '../../core/src/simulation/enemy-combat.ts';
import { hero, arena } from './tactics.fixture.ts';
import { commitCharacterCommand } from './commands/character.ts';

test('healing credits the caster for actual player/companion HP restored and expires its rolling rate', () => {
  const caster = hero();
  const ally = hero('warrior');
  ally.hitpoints = ally.maxHitpoints - 3;
  heal(ally, 1, caster, 10000);
  heal(ally, 1, caster, 10000);
  assert.equal(caster.healingMeter!.total, 3);
  assert.equal(ally.healingMeter, undefined);
  tickCompanion(caster, undefined, 0, 0);
  caster.bear!.hitpoints -= 2;
  heal(caster.bear!, 1, caster, 11000);
  assert.equal(caster.healingMeter!.total, 5);
  assert.equal(caster.healingMeter!.perSecond, 1);
  refreshCombatTotals(caster, 14999);
  assert.equal(caster.healingMeter!.perSecond, 1);
  refreshCombatTotals(caster, 15000);
  assert.equal(caster.healingMeter!.perSecond, 0.4);
  refreshCombatTotals(caster, 16000);
  assert.equal(caster.healingMeter!.perSecond, 0);
  assert.equal(caster.healingMeter!.total, 5);
});

test('consumables count effective self healing', () => {
  const player = hero('warrior');
  const potion = Object.values(game.rules.CONSUMABLES)[0];
  const itemId = Object.keys(game.rules.CONSUMABLES)[0];
  player.backpack = [{ id: 'potion', itemId, quantity: 2 }];
  player.hitpoints = player.maxHitpoints - 1;
  game.rules.useBackpackItem(player, 'potion');
  assert(potion.healing > 1);
  assert.equal(player.healingMeter!.total, 1);
  assert.equal(player.hitpoints, player.maxHitpoints);
  assert.throws(() => {
    game.rules.useBackpackItem(player, 'potion');
  }, /do not need healing/);
  assert.equal(player.healingMeter!.total, 1);
});

test('item commands publish healing only after saving and retain the live rolling history', (t) => {
  t.mock.method(Date, 'now', () => {
    return 11000;
  });
  const player = hero('warrior');
  player.hitpoints -= 5;
  applyHealing(player, 5, player, 10000);
  player.hitpoints -= 3;
  player.backpack = [{ id: 'potion', itemId: Object.keys(game.rules.CONSUMABLES)[0], quantity: 1 }];
  const world = { id: 'world', merchant: freshMerchant() };
  let fail = true;
  const store = {
    merchant: () => {
      return freshMerchant();
    },
    save: () => {
      if (fail) {
        throw new Error('disk failed');
      }
    },
  };
  const consume = () => {
    return commitCharacterCommand(
      { type: 'useItem', id: 'potion' },
      player,
      world,
      'character',
      store,
    );
  };

  const before = structuredClone(player);
  assert.throws(consume, /Unable to save item action/);
  assert.deepEqual(player, before);
  fail = false;
  consume();
  assert.equal(player.hitpoints, player.maxHitpoints);
  assert.equal(player.backpack.length, 0);
  assert.equal(player.healingMeter!.total, 8);
  assert.equal(player.healingMeter!.perSecond, 1.6);
  refreshCombatTotals(player, 15000);
  assert.equal(player.healingMeter!.perSecond, 0.6);
});

test('incoming melee/projectiles count only HP lost after shields, cooldowns and lethal caps', () => {
  const player = hero('warrior');
  const scene = arena();

  const fire = (now: number, damage: number) => {
    scene.projectiles = [
      {
        id: ++scene.sequence,
        x: player.x,
        y: player.y,
        vx: 0,
        vy: 0,
        expiresAt: now + 1000,
        damage,
      },
    ];
    tickEnemyCombat(scene, [player], now, 0, ENEMY_STATS, game);
  };

  shield(player, scene, 100, 20000);
  fire(10000, 3);
  assert.equal(player.receivedMeter, undefined);
  fire(11000, 102);
  const lost = player.maxHitpoints - player.hitpoints;
  assert(lost > 0 && lost < 102);
  assert.equal(player.receivedMeter!.total, lost);
  fire(11001, 100);
  assert.equal(player.receivedMeter!.total, lost);
  scene.enemies = [
    {
      id: 1,
      x: player.x,
      y: player.y,
      angle: 0,
      hitpoints: 100,
      attack: {
        startedAt: 11000,
        endsAt: 12000,
        x: player.x,
        y: player.y,
        radius: 100,
        ranged: false,
      },
    },
  ];
  tickEnemyCombat(scene, [player], 12000, 0, ENEMY_STATS, game);
  assert(player.receivedMeter!.total > lost);
  fire(13000, 10000);
  assert.equal(player.hitpoints, 0);
  assert.equal(player.receivedMeter!.total, player.maxHitpoints);
  fire(14000, 10000);
  assert.equal(player.receivedMeter!.total, player.maxHitpoints);
  refreshCombatTotals(player, 18000);
  assert.equal(player.receivedMeter!.perSecond, 0);
});

test('training refreshes all modes and class changes clear their session totals', () => {
  const player = hero();
  player.hitpoints -= 5;
  applyHealing(player, 5, player, 10000);
  const scene = createTrainingScene(10000);
  tickTraining(scene, [player], 15000, 0);
  assert.equal(player.healingMeter!.perSecond, 0);
  assert.equal(player.healingMeter!.total, 5);
  player.classId = 'mage';
  tickTraining(scene, [player], 15001, 0);
  assert.equal(player.healingMeter, undefined);
  player.hitpoints -= 2;
  applyHealing(player, 2, player, 16000);
  assert.equal(player.healingMeter!.total, 2);
  assert.equal(player.healingMeter!.classId, 'mage');
});
