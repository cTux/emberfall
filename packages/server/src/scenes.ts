// Keep the existing thirty-unit spacing between players entering a scene.
const SCENE_ENTRY_SPACING = 30;

import { enterScene, returnToLobby } from './scene-travel.ts';
export { returnToLobby } from './scene-travel.ts';
import { FOREST_DEFINITION } from '@emberfall/core/definitions/worlds/forest';
import {
  dimensionDefinition,
  levelUp,
  stepCombat,
  tickTraining,
  createTrainingScene,
  nearbyInteraction,
} from '@emberfall/core';
import { randomUUID } from 'node:crypto';
import { hasLivingScenePlayers } from '@emberfall/common';
import type { Player, SceneState, ClientMessage, ChatMessage } from '@emberfall/common';
import { addChat } from './chat.ts';
import { simulationFor } from './ecs/simulation.ts';

export interface Scene extends SceneState {
  nextSpawn: number;
  sequence: number;
  electorate: string;
}
export interface SceneWorld {
  rewardPlayers?: Player[];
  chat?: ChatMessage[];
  players: Map<string, Player>;
  scene?: Scene;
  training?: SceneState;
  skipTraining?: boolean;
  runKey?: string;
  voters?: Player[];
  resources?: Record<string, import('@emberfall/common').ResourceState>;
}

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

export function cleanupScene(world: SceneWorld) {
  if (
    world.scene &&
    world.scene.phase === 'ended' &&
    ![...world.players.values()].some((p) => {
      return p.scene === 'forest';
    })
  ) {
    world.scene = undefined;
  }
}

export function reconcileVote(world: SceneWorld, now: number) {
  const scene = world.scene;

  if (!scene || !['voting', 'countdown'].includes(scene.phase)) {
    return;
  }

  const ids = (
    world.voters?.map((p) => {
      return p.id;
    }) ?? [...world.players.keys()]
  ).sort();
  const electorate = ids.join(',');

  if (scene.electorate !== electorate) {
    scene.countdownAt = null;
    scene.electorate = electorate;
  }

  scene.ready = scene.ready.filter((id) => {
    return ids.includes(id);
  });

  if (
    ids.length &&
    ids.every((id) => {
      return scene.ready.includes(id);
    })
  ) {
    scene.countdownAt ??= now + FOREST_DEFINITION.countdownMs;
    scene.phase = 'countdown';
  } else {
    scene.phase = 'voting';
    scene.countdownAt = null;
  }
}

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

export { sceneState } from './scene-projection.ts';
