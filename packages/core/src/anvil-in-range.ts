import { ANVIL } from './anvil.ts';
import { forestDistance } from './forest-distance.ts';
import { COLLISION } from './definitions/collision.ts';
import { INTERACTION_RADIUS } from './definitions/worlds/forest.ts';

export function anvilInRange(player: { x: number; y: number; scene?: string; hitpoints: number }) {
  return (
    !player.scene &&
    player.hitpoints > 0 &&
    !!ANVIL &&
    forestDistance({ x: player.x, y: player.y + COLLISION.feetOffset }, ANVIL) < INTERACTION_RADIUS
  );
}
