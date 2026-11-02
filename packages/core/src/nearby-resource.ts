import { resourceNodes } from './resource-nodes.ts';
import { GATHER_RANGE } from './gather-range.ts';
import { resourceState } from './resource-state.ts';
import type { Player, ResourceState } from '@emberfall/common';
import { COLLISION } from './definitions/collision.ts';

export function nearbyResource(
  player: Pick<Player, 'x' | 'y' | 'scene' | 'hitpoints' | 'dimension'>,
  states: Record<string, ResourceState> | undefined,
  now: number,
) {
  if (player.hitpoints <= 0) {
    return undefined;
  }

  return resourceNodes({ ...player, y: player.y + COLLISION.feetOffset }, GATHER_RANGE)
    .filter((node) => {
      return resourceState(states, node, now)?.remaining !== 0;
    })
    .sort((a, b) => {
      return (
        Math.hypot(a.x - player.x, a.y - player.y - COLLISION.feetOffset) -
        Math.hypot(b.x - player.x, b.y - player.y - COLLISION.feetOffset)
      );
    })[0];
}
