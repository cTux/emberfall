import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOBBY_PORTAL } from '@emberfall/core';
import { clientMessage, Difficulty } from '@emberfall/common';
import { clientMessage as validatedMessage } from '@emberfall/core';
import { sceneAction, tickScene, sceneState } from './scenes.ts';
import type { SceneWorld } from './scenes.ts';
import { hero } from './scenes.fixture.ts';

for (const [difficulty, multiplier] of [
  [Difficulty.Easy, 1],
  [Difficulty.Medium, 2],
  [Difficulty.Hard, 4],
] as const) {
  test(`${difficulty} commands create and regenerate scenes with scaled boss health and damage`, () => {
    const a = hero('a');
    a.autoAttack = false;
    const world: SceneWorld = { players: new Map([[a.id, a]]) };
    const command = { type: 'createScene', scene: 'Forest', difficulty } as const;
    assert.deepEqual(clientMessage.parse(command), command);
    sceneAction(world, a, validatedMessage.parse(command), 0);
    assert.equal(sceneState(world.scene)?.difficulty, difficulty);
    sceneAction(world, a, { type: 'ready', ready: true }, 0);
    tickScene(world, 5000, 0);
    const scene = world.scene!;
    scene.endsAt = 5000;
    tickScene(world, 5000, 0);
    const boss = scene.spawns!.find((spawn) => spawn.kind === 'boss')!;
    assert.ok(boss);
    assert.equal(boss.hitpoints, 300 * multiplier);
    assert.equal(boss.maxHitpoints, 300 * multiplier);
    // An already telegraphed caster shot exercises the authoritative damage path.
    scene.spawns = [];
    scene.bossId = undefined;
    scene.endsAt = Infinity;
    scene.nextSpawn = Infinity;
    scene.enemies = [
      {
        id: ++scene.sequence,
        archetype: 'caster',
        kind: 'normal',
        x: a.x - 100,
        y: a.y,
        angle: 0,
        hitpoints: 7 * multiplier,
        maxHitpoints: 7 * multiplier,
        attack: { startedAt: 5000, endsAt: 6000, x: a.x, y: a.y, radius: 22, ranged: true },
      },
    ];
    tickScene(world, 6000, 0);
    assert.equal(scene.projectiles?.[0]?.damage, 3 * multiplier);
    a.hitpoints = 0;
    sceneAction(world, a, { type: 'returnLobby' }, 6500);
    a.x = LOBBY_PORTAL.x;
    a.y = LOBBY_PORTAL.y - 15;
    sceneAction(world, a, command, 7000);
    assert.notEqual(world.scene!.id, scene.id);
    assert.equal(world.scene!.difficulty, difficulty);
    assert.equal(world.scene!.phase, 'voting');
  });
}
