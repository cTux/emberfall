import type { Player } from '@emberfall/common';
import { FOREST_PORTAL } from '@emberfall/core';
import { VILLAGE_DEFINITION } from '@emberfall/core/definitions/worlds/village';
import type { SceneWorld } from './scenes.ts';
import { addChat } from './chat.ts';

export function returnToLobby(world: SceneWorld, player: Player) {
  if (player.scene) {
    addChat(world, `${player.name} left the scene. Everyone became weaker.`, undefined, player.id);
  }

  player.scene = undefined;
  delete player.dimension;
  player.x = VILLAGE_DEFINITION.returnSpawn.x;
  player.y = VILLAGE_DEFINITION.returnSpawn.y;
  player.hitpoints = player.maxHitpoints;
  player.attackAt = undefined;
  player.attackAngle = undefined;
  player.attackTargetId = undefined;

  if (player.bear) {
    player.bear.hitpoints = player.bear.maxHitpoints;
    player.bear.resurrectAt = undefined;
    player.bear.x = player.x;
    player.bear.y = player.y;
    player.bear.returning = false;
  }
}

export function enterScene(world: SceneWorld, player: Player, offset = 0) {
  addChat(
    world,
    `${player.name} joined the scene. Everyone became stronger.`,
    undefined,
    player.id,
  );
  player.scene = 'forest';
  player.dimension = world.scene?.dimension ?? 'forest';

  if (world.runKey) {
    player.runId = world.runKey;
  }

  if (!world.players.has(player.id)) {
    world.players.set(player.id, player);
  }

  player.x = FOREST_PORTAL.x + offset;
  player.y = FOREST_PORTAL.y;
  player.hitpoints = player.maxHitpoints;
  player.attackAt = undefined;
  player.attackAngle = undefined;
  player.attackTargetId = undefined;

  if (player.bear) {
    player.bear.x = player.x;
    player.bear.y = player.y;
    player.bear.returning = false;
  }
}
