import type { SceneWorld } from './scenes.ts';
import type { Player } from '@emberfall/common';
import { addChat } from './chat.ts';
import { VILLAGE_DEFINITION } from '@emberfall/core/definitions/worlds/village';

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
