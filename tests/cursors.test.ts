import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Player, WorldState } from '../packages/common/src/index.ts';
import {
  CLASS_IDS,
  FOREST,
  createTrainingScene,
  starterEquipment,
} from '../packages/core/src/index.ts';
import { enemyHitbox } from '../packages/core/src/hitboxes.ts';
import { combatCursor } from '../packages/client/src/cursors.ts';
import { freshProgress } from '../packages/server/src/characters.ts';

test('combat feedback gates all classes on weapon, life, training, scene and input availability', () => {
  const training = createTrainingScene(0);
  const player: Player = {
    ...freshProgress(),
    id: 'cursor',
    name: 'Cursor',
    color: 0,
    x: training.enemies[0].x,
    y: training.enemies[0].y,
  };
  const world: WorldState = {
    id: 'w',
    name: 'World',
    hostId: player.id,
    players: [player],
    training,
  };
  const pointer = enemyHitbox(training.enemies[0]);
  for (const classId of CLASS_IDS) {
    player.classId = classId;
    player.equipment = starterEquipment(classId);
    assert.equal(combatCursor(world, player, pointer, false, false, true), 'attack');
    assert.equal(combatCursor(world, player, pointer, false, false, false), 'aim');
    assert.equal(combatCursor(world, player, pointer, true, false, false), 'pressed');
    assert.equal(combatCursor(world, player, pointer, true, true, false), 'default');
    assert.equal(combatCursor(world, player, undefined, true, false, false), 'default');
    player.equipment = {};
    assert.equal(combatCursor(world, player, pointer, true, false, false), 'default');
  }
  player.equipment = starterEquipment(player.classId!);
  player.x = 0;
  player.y = 0;
  assert.equal(combatCursor(world, player, pointer, true, false, false), 'default');
  player.scene = 'forest';
  world.scene = { ...training, training: false, phase: 'ended' };
  assert.equal(combatCursor(world, player, pointer, true, false, false), 'default');
  world.scene.phase = 'active';
  world.scene.pausedAt = 100;
  assert.equal(combatCursor(world, player, pointer, true, false, false), 'default');
  player.hitpoints = 0;
  assert.equal(combatCursor(world, player, pointer, true, false, false), 'disabled');
  assert.equal(combatCursor(null, player, pointer, true, false, false), 'default');
});

test('enemy hover uses model centers and wrapped copies and ignores dead enemies', () => {
  const scene = createTrainingScene(0);
  scene.enemies = [{ ...scene.enemies[0], x: FOREST.width - 2, y: FOREST.height - 2 }];
  const player: Player = {
    ...freshProgress(),
    id: 'cursor',
    name: 'Cursor',
    color: 0,
    x: 2,
    y: 2,
    scene: 'forest',
  };
  const world: WorldState = { id: 'w', name: 'World', hostId: player.id, players: [player], scene };
  const body = enemyHitbox(scene.enemies[0]);
  const pointer = { x: body.x - FOREST.width, y: body.y - FOREST.height };
  assert.equal(combatCursor(world, player, pointer, false, false, true), 'attack');
  assert.equal(combatCursor(world, player, { x: 100, y: 100 }, false, false, true), 'default');
  scene.enemies[0].hitpoints = 0;
  assert.equal(combatCursor(world, player, pointer, false, false, true), 'default');
});
