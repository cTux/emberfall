import assert from 'node:assert/strict';
import test from 'node:test';
import type { Player, SceneState } from '@emberfall/common';
import {
  createGame,
  game,
  GAME_MODS,
  hitWithWeapon,
  tickDebuffs,
  tickTraining,
  createTrainingScene,
  TRAINING_ZONES,
  learnTalent,
  equipTalent,
  talentNodeId,
  talentRank,
  castTalentAbility,
} from '@emberfall/core';
import { tickTalentEffects } from '../../core/src/talent-effects.ts';
import { tickSpawns } from '../../core/src/simulation/spawns.ts';
import { freshProgress } from './characters.ts';

const hero = (): Player => ({
  ...freshProgress(),
  id: 'hero',
  name: 'Hero',
  color: 0,
  level: 20,
  x: 1000,
  y: 1000,
  scene: 'forest',
});
const arena = (): SceneState => ({
  id: 'test',
  type: 'Forest',
  difficulty: 'Easy',
  phase: 'active',
  ready: [],
  countdownAt: null,
  endsAt: 1e9,
  nextSpawn: 1e9,
  sequence: 0,
  enemies: [],
  damage: [],
  portals: [],
});
function source(seed = 123) {
  let draws = 0;
  return {
    random: () => {
      draws++;
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 2 ** 32;
    },
    draws: () => draws,
  };
}

test('injected combat and spawn outcomes match default seeded draw order', (t) => {
  function exercise(context: typeof game) {
    const player = hero(),
      scene = arena();
    const stats = context.rules.characterStats(player);
    for (let id = 1; id <= 80; id++) {
      const enemy = { id, x: 1050, y: 1000, angle: 0, hitpoints: 1, kind: 'boss' as const };
      scene.enemies.push(enemy);
      hitWithWeapon(scene, enemy, player, 1000 + id, 'bleed', 1, stats, false, context);
    }
    scene.enemies = [];
    const enemies = Object.fromEntries(context.registries.enemies.entries());
    for (let i = 0; i < 20; i++) {
      scene.nextSpawn = 0;
      scene.spawns = [];
      tickSpawns(scene, [player], 2000 + i, 1, enemies, context);
    }
    return { scene, experience: player.experience, meter: player.damageMeter };
  }
  const defaults = source(),
    injected = source();
  t.mock.method(Math, 'random', defaults.random);
  const expected = exercise(game);
  t.mock.method(Math, 'random', () => {
    throw new Error('injected context used global random');
  });
  assert.deepEqual(exercise(createGame(GAME_MODS, injected.random)), expected);
  assert.equal(injected.draws(), defaults.draws());
  assert(injected.draws() > 160, 'fixture exercises critical, reward, item and spawn rolls');
});

test('independent contexts bind item outcomes and keep explicit item overrides', (t) => {
  t.mock.method(Math, 'random', () => {
    throw new Error('global random');
  });
  const low = createGame(GAME_MODS, () => 0),
    high = createGame(GAME_MODS, () => 0.99);
  const rolled = (context: typeof game, random?: () => number) => {
    const { id: _id, ...item } = context.rules.rollItem('warrior-sword', random);
    return item;
  };
  assert.notDeepEqual(rolled(low), rolled(high));
  assert.deepEqual(
    rolled(low, () => 0.99),
    rolled(high),
  );
  assert.deepEqual(rolled(low), rolled(low));
});

test('training forwards its context for hit rolls and never rolls rewards', (t) => {
  t.mock.method(Math, 'random', () => {
    throw new Error('global random');
  });
  let draws = 0;
  const context = createGame(GAME_MODS, () => {
    draws++;
    return 0;
  });
  const player = { ...hero(), scene: undefined, x: TRAINING_ZONES[0].x - 15, y: 355 };
  const scene = createTrainingScene(0);
  scene.nextSpawn = 1e9;
  tickTraining(scene, [player], 1000, 0.05, context);
  assert(draws > 0, 'training weapon critical roll uses its context');
  const enemy = scene.enemies[0];
  enemy.hitpoints = 1;
  enemy.debuffs = [
    { kind: 'bleed', stacks: 1, expiresAt: 2000, nextTick: 1000, ownerId: player.id },
  ];
  const before = draws;
  tickDebuffs(scene, [player], 1000, context);
  assert.equal(enemy.hitpoints, 0);
  assert.equal(draws, before, 'training death has no reward draws');
  assert.equal(player.experience, 0);
  assert.equal(scene.drops?.length ?? 0, 0);
});

test('scheduled talent hits retain the casting context', (t) => {
  t.mock.method(Math, 'random', () => {
    throw new Error('global random');
  });
  let draws = 0;
  const context = createGame(GAME_MODS, () => {
    draws++;
    return 0.5;
  });
  const player = hero(),
    scene = arena();
  scene.training = true;
  scene.enemies.push({ id: 1, x: 1050, y: 1000, angle: 0, hitpoints: 1000 });
  const id = talentNodeId('warrior', 0, 3);
  learnTalent(player, id);
  assert.equal(talentRank(player, id), 1);
  equipTalent(player, 0, id);
  assert(
    castTalentAbility(
      scene,
      player,
      {
        slot: 0,
        classId: 'warrior',
        epoch: scene.id,
        aimX: 1050,
        aimY: 1000,
      },
      1000,
      context,
    ),
  );
  const before = scene.enemies[0].hitpoints;
  tickTalentEffects(scene, [player], 2000);
  assert(scene.enemies[0].hitpoints < before);
  assert(draws >= 3, 'all scheduled critical rolls use the captured context');
});
