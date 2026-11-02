import type { SceneWorld } from './scene-world.ts';
import { cleanupScene } from './cleanup-scene.ts';
import { reconcileVote } from './reconcile-vote.ts';
import type { ClientMessage, Player } from '@emberfall/common';
import { nearbyInteraction, dimensionDefinition } from '@emberfall/core';
import { returnToLobby, enterScene } from './scene-travel.ts';
import { hasLivingScenePlayers } from '@emberfall/common';
import { randomUUID } from 'node:crypto';

type SceneHandlers = {
  [K in ClientMessage['type']]?: (
    world: SceneWorld,
    player: Player,
    message: Extract<ClientMessage, { type: K }>,
    now: number,
  ) => void;
};

function leaveScene(
  world: SceneWorld,
  player: Player,
  message: Extract<ClientMessage, { type: 'returnLobby' | 'leaveScene' }>,
) {
  if (
    player.scene !== 'forest' ||
    (message.type !== 'leaveScene' &&
      player.hitpoints > 0 &&
      nearbyInteraction(player, world.scene?.phase === 'ended', world.scene?.portals)?.id !==
        'return')
  ) {
    throw new Error('Use the return portal after the scene ends.');
  }

  returnToLobby(world, player);
  cleanupScene(world);
}

const sceneHandlers: SceneHandlers = {
  createScene(world, player, message) {
    if (nearbyInteraction(player)?.id !== 'portal') {
      throw new Error('Move closer to the village portal.');
    }

    if (world.scene) {
      if (
        ['voting', 'countdown'].includes(world.scene.phase) ||
        hasLivingScenePlayers(world.players.values())
      ) {
        throw new Error(
          'A scene already exists. All living players must leave before regenerating it.',
        );
      }

      for (const participant of world.players.values()) {
        if (participant.scene === 'forest') {
          returnToLobby(world, participant);
        }
      }
    }

    const dimension = dimensionDefinition(message.dimension);
    world.scene = {
      dimension: dimension.id,
      id: randomUUID(),
      type: 'Forest',
      difficulty: message.difficulty,
      phase: 'voting',
      ready: [],
      countdownAt: null,
      endsAt: null,
      enemies: [],
      damage: [],
      nextSpawn: 0,
      sequence: 0,
      portals: [],
      electorate: '',
    };
  },
  joinScene(world, player) {
    if (nearbyInteraction(player)?.id !== 'portal') {
      throw new Error('Move closer to the village portal.');
    }

    if (world.scene?.phase !== 'active' || world.scene.portals.length) {
      throw new Error(
        'This scene is not open for joining. Create a new one after everyone returns.',
      );
    }

    enterScene(world, player);
  },
  ready(world, player, message, now) {
    const scene = world.scene;

    if (!scene || !['voting', 'countdown'].includes(scene.phase) || player.scene) {
      throw new Error('There is no departure vote.');
    }

    scene.ready = scene.ready.filter((id) => {
      return id !== player.id;
    });

    if (message.ready) {
      scene.ready.push(player.id);
    }

    reconcileVote(world, now);
  },
  returnLobby: leaveScene,
  leaveScene,
};

export function sceneAction<K extends ClientMessage['type']>(
  world: SceneWorld,
  player: Player,
  message: Extract<ClientMessage, { type: K }> & { type: K },
  now: number,
) {
  sceneHandlers[message.type]?.(world, player, message, now);
}
