import type { SceneWorld } from './scenes.ts';
import type { Player } from '@emberfall/core/contracts';
import { addChat } from './chat.ts';
import { FOREST_PORTAL } from '@emberfall/core';

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
