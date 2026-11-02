import type { SceneWorld } from './scene-world.ts';
import { reconcileVote } from './reconcile-vote.ts';
import { cleanupScene } from './cleanup-scene.ts';
import { simulationFor } from './ecs/simulation.ts';
import { createTrainingScene, tickTraining, stepCombat, levelUp } from '@emberfall/core';
import { FOREST_DEFINITION } from '@emberfall/core/definitions/worlds/forest';
import { enterScene } from './scene-travel.ts';
import { addChat } from './chat.ts';

// Keep the existing thirty-unit spacing between players entering a scene.
const SCENE_ENTRY_SPACING = 30;

export function tickScene(world: SceneWorld, now: number, dt: number) {
  const entities = simulationFor(world.players);

  if (!world.skipTraining) {
    world.training ??= createTrainingScene(now);
  }

  entities?.retain([world.training, world.scene]);

  if (world.training) {
    entities?.bind(world.training);
  }

  if (world.scene) {
    entities?.bind(world.scene);
  }

  if (world.training) {
    world.training = tickTraining(world.training, [...world.players.values()], now, dt);
  }

  reconcileVote(world, now);
  const scene = world.scene;

  if (!scene) {
    return;
  }

  if (scene.phase === 'countdown' && now >= scene.countdownAt!) {
    scene.phase = 'active';
    scene.endsAt = now + FOREST_DEFINITION.durationMs;
    scene.countdownAt = null;
    scene.nextSpawn = now;
    let index = 0;

    for (const player of world.voters ?? world.players.values()) {
      enterScene(world, player, (index++ - world.players.size / 2) * SCENE_ENTRY_SPACING);
    }
  }

  if (scene.phase !== 'active' && scene.phase !== 'ended') {
    return;
  }

  const living = [...world.players.values()].filter((player) => {
    return player.hitpoints > 0;
  });
  stepCombat(scene, [...world.players.values()], now, dt, undefined, world.rewardPlayers);

  for (const player of world.players.values()) {
    Object.assign(player, levelUp(player));
  }

  for (const player of living) {
    if (player.hitpoints <= 0) {
      addChat(world, `${player.name} died.`, undefined, player.id);
    }
  }

  cleanupScene(world);
}
