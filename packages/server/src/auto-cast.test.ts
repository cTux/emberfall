import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FOREST,
  TRAINING_ZONES,
  characterStats,
  tickPlayerCombat,
  createTrainingScene,
} from '@emberfall/core';
import { LocalMovement } from '../../client/src/local-movement.ts';
import type { Player, WorldState } from '@emberfall/common';

test('ranged auto-casts wait for a living target in range, then launch and damage it', (t) => {
  t.mock.method(Math, 'random', () => {
    return 0.5;
  });

  for (const training of [false, true]) {
    for (const classId of ['ranger', 'mage', 'druid']) {
      for (const axis of ['x', 'y'] as const) {
        const player: Player = {
          id: 'p',
          name: 'Hero',
          color: 0,
          classId,
          x: training ? TRAINING_ZONES[0].x : 5,
          y: training ? TRAINING_ZONES[0].y - 15 : 5,
          scene: training ? undefined : 'forest',
          level: 1,
          experience: 0,
          playtimeSeconds: 0,
          hitpoints: 100,
          maxHitpoints: 100,
        };
        const stats = characterStats(player);
        const scene = createTrainingScene(10000);
        scene.training = training;
        const target = { id: 1, x: player.x, y: player.y, angle: 0, hitpoints: 100 };
        const boundary = axis === 'x' ? FOREST.width : FOREST.height;
        target[axis] = (player[axis] - stats.range - 0.01 + boundary) % boundary;
        scene.enemies = [target, { ...target, id: 2, x: player.x, y: player.y, hitpoints: 0 }];
        tickPlayerCombat(scene, [player], 10000, 0);
        assert.equal(player.attackAt, undefined, `${training}/${classId}/${axis}: no empty cast`);
        assert.equal(scene.playerShots?.length ?? 0, 0);
        target[axis] = (player[axis] - stats.range + boundary) % boundary;
        tickPlayerCombat(scene, [player], 10550, 0);
        assert.equal(player.attackAt, 10550, 'entering range starts a fresh cast immediately');
        assert.equal(scene.playerShots?.length, classId === 'druid' ? 1 : 2);
        assert(
          scene.playerShots.every((shot) => {
            return shot.targetId === target.id;
          }),
        );
        // At maximum bow range its spread can legitimately pass beside a small body.
        target[axis] = (player[axis] - 100 + boundary) % boundary;

        for (let now = 10600; now <= 11450; now += 50) {
          tickPlayerCombat(scene, [player], now, 0.05);
        }

        assert(target.hitpoints < 100, 'authoritative projectile hits deal damage');
        scene.enemies = [];
        tickPlayerCombat(scene, [player], 12000, 0);
        assert.equal(player.attackAt, 10550, 'waiting does not consume another cooldown');
        target.hitpoints = 100;
        scene.enemies = [target];
        tickPlayerCombat(scene, [player], 12550, 0);
        assert.equal(player.attackAt, 12550, 'resume at the actual cast time after a long wait');
        assert(scene.playerShots.length > 0, 'an overdue cast must still launch');
        const shot = scene.playerShots[0];
        const position = { x: shot.x, y: shot.y };
        scene.enemies = [];
        tickPlayerCombat(scene, [player], 12600, 0.05);
        assert(
          scene.playerShots.includes(shot),
          'losing the target must not cancel shots in flight',
        );
        assert.notDeepEqual({ x: shot.x, y: shot.y }, position);
      }
    }
  }
});

test('automatic projectile prediction stops empty cycles without mutating snapshots', () => {
  for (const training of [false, true]) {
    for (const classId of ['ranger', 'mage', 'druid']) {
      const scene = createTrainingScene(10000);
      scene.training = training;
      scene.enemies = [];
      const source: WorldState = {
        id: 'world',
        name: 'World',
        hostId: 'p',
        serverNow: 10000,
        players: [
          {
            id: 'p',
            name: 'Hero',
            color: 0,
            classId,
            x: TRAINING_ZONES[0].x,
            y: TRAINING_ZONES[0].y - 15,
            scene: training ? undefined : 'forest',
            attackAt: 9100,
            level: 1,
            experience: 0,
            playtimeSeconds: 0,
            hitpoints: 100,
            maxHitpoints: 100,
          },
        ],
        ...(training ? { training: scene } : { scene }),
      };
      const movement = new LocalMovement('p', () => {});
      movement.render(source, 0);
      const player = movement.render(source, 100)!;
      assert.equal(movement.animateAttack(player, structuredClone(source), 100), false);
      assert.equal(player.attackAt, -900, 'keep the expired confirmed cast, without a new pulse');
      assert.deepEqual(source.players[0].attackAt, 9100, 'never mutate the snapshot');
    }
  }
});
