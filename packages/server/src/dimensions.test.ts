import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIMENSION_IDS } from '@emberfall/common';
import {
  prepareState,
  applyState,
  materializeState,
  SessionState,
} from '@emberfall/common/protocol';
import {
  dimensionDefinition,
  clientMessage,
  ENEMY_STATS,
  stepCombat,
  moveEnemies,
  forestDistance,
  rollRarity,
  Rarity,
  createGame,
  GAME_MODS,
  hitEnemy,
} from '@emberfall/core';
import { sceneAction, tickScene, sceneState, type SceneWorld } from './scenes.ts';
import { hero } from './scenes.fixture.ts';
import { scene as combatScene, hero as combatHero } from './classes.fixture.ts';

for (const dimension of DIMENSION_IDS) {
  test(`${dimension}: portal vote, entry, boss scaling, projection and return preserve dimension`, () => {
    const player = hero('p');
    player.autoAttack = false;
    const world: SceneWorld = { players: new Map([[player.id, player]]), skipTraining: true };
    const definition = dimensionDefinition(dimension);
    sceneAction(
      world,
      player,
      clientMessage.parse({ type: 'createScene', scene: 'Forest', difficulty: 'Hard', dimension }),
      0,
    );
    sceneAction(world, player, { type: 'ready', ready: true }, 0);
    tickScene(world, 5000, 0);
    assert.equal(player.dimension, dimension);
    assert.equal(player.scene, 'forest');
    const scene = world.scene!;
    assert.equal(sceneState(scene)?.dimension, dimension);
    const wire = new SessionState();
    applyState(
      wire,
      prepareState({
        id: 'world',
        name: 'test',
        hostId: player.id,
        players: [player],
        scene: sceneState(scene),
      }),
    );
    assert.equal(materializeState(wire)?.scene?.dimension, dimension);
    assert.equal(materializeState(wire)?.players[0].dimension, dimension);
    scene.spawns = [];
    scene.endsAt = 5000;
    tickScene(world, 5000, 0);
    const boss = scene.spawns.find((enemy) => {
      return enemy.kind === 'boss';
    });
    assert.ok(boss);
    const stats = ENEMY_STATS[boss.archetype!];
    assert.equal(boss.maxHitpoints, stats.hitPoints * 10 * 4 * definition.enemyMultiplier);
    player.hitpoints = 0;
    sceneAction(world, player, { type: 'returnLobby' }, 6000);
    assert.equal(player.dimension, undefined);
    assert.equal(player.scene, undefined);
  });

  test(`${dimension}: movement, damage, attack speed and radius use the dimension factor`, () => {
    const player = combatHero();
    player.autoAttack = false;
    const scene = combatScene();
    scene.dimension = dimension;
    const scale = dimensionDefinition(dimension).enemyMultiplier;
    scene.enemies = [
      {
        id: 1,
        archetype: 'skeleton',
        kind: 'normal',
        x: player.x - 35,
        y: player.y,
        angle: 0,
        hitpoints: 100,
      },
    ];
    stepCombat(scene, [player], 10000, 0);
    const enemy = scene.enemies[0];
    assert.equal(enemy.attack!.radius, ENEMY_STATS.skeleton.reach * scale);
    assert.equal(enemy.attack!.endsAt, 10000 + ENEMY_STATS.skeleton.windup / scale);
    stepCombat(scene, [player], enemy.attack!.endsAt, 0);
    assert.equal(player.hitpoints, 100 - 3 * scale);
    assert.equal(
      enemy.cooldownUntil,
      10000 + ENEMY_STATS.skeleton.windup / scale + ENEMY_STATS.skeleton.cooldown / scale,
    );
    const walker = { id: 2, archetype: 'skeleton', x: 2400, y: 1280, angle: 0, hitpoints: 100 };
    moveEnemies(
      [walker],
      [{ id: 'target', x: 2500, y: 1280, hitpoints: 100 }],
      0.1,
      0,
      undefined,
      'Easy',
      dimension,
    );
    assert.ok(Math.abs(forestDistance(walker, { x: 2400, y: 1280 }) - 6.4 * scale) < 0.00001);
  });
}

test('unknown dimensions are rejected and omitted dimension retains forest compatibility', () => {
  assert.equal(
    clientMessage.safeParse({
      type: 'createScene',
      scene: 'Forest',
      difficulty: 'Easy',
      dimension: 'lava',
    }).success,
    false,
  );
  const player = hero('legacy');
  const world = { players: new Map([[player.id, player]]) } as SceneWorld;
  sceneAction(world, player, { type: 'createScene', scene: 'Forest', difficulty: 'Easy' }, 0);
  assert.equal(world.scene!.dimension, 'forest');
});

test('rarity modifiers multiply higher-quality probability intervals without changing forest rolls', () => {
  assert.equal(
    rollRarity(() => {
      return 0.00011;
    }),
    Rarity.Epic,
  );
  assert.equal(
    rollRarity(() => {
      return 0.00011;
    }, 1.3),
    Rarity.Legendary,
  );
  assert.equal(
    rollRarity(() => {
      return 0.00015;
    }, 1.3),
    Rarity.Epic,
  );
  assert.equal(
    rollRarity(() => {
      return 0.00015;
    }, 1.6),
    Rarity.Legendary,
  );
  assert.equal(
    rollRarity(() => {
      return 0.99999;
    }, 1.6),
    Rarity.Common,
  );
});

test('real enemy drops use dimension rarity while merchant and training outcomes retain base rules', () => {
  const context = createGame(GAME_MODS, () => {
    return 0.00015;
  });

  for (const dimension of DIMENSION_IDS) {
    const run = combatScene();
    run.dimension = dimension;
    const player = combatHero();
    const enemy = {
      id: 1,
      x: player.x,
      y: player.y,
      hitpoints: 1,
      angle: 0,
      kind: 'boss' as const,
    };
    hitEnemy(
      run,
      enemy,
      1,
      player,
      1000,
      undefined,
      'physical',
      false,
      'Attack',
      undefined,
      context,
    );
    const gear = run.drops!.filter((drop) => {
      return drop.kind === 'item';
    });
    assert.equal(gear.length, 1);
    assert.equal(gear[0].rarity, dimension === 'desert' ? Rarity.Legendary : Rarity.Epic);
    assert.equal(context.rules.rollItem('warrior-sword').rarity, Rarity.Epic);
    run.training = true;
    run.drops = [];
    hitEnemy(
      run,
      { ...enemy, hitpoints: 1 },
      1,
      player,
      2000,
      undefined,
      'physical',
      false,
      'Attack',
      undefined,
      context,
    );
    assert.deepEqual(run.drops, []);
  }
});
