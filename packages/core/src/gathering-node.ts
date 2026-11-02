import { resourceNodes } from './resource-nodes.ts';
import { GATHER_RANGE } from './gather-range.ts';
import { resourceState } from './resource-state.ts';
import type { Player, ResourceState } from '@emberfall/common';
import { COLLISION } from './definitions/collision.ts';

export function gatheringNode(
  player: Player,
  states: Record<string, ResourceState> | undefined,
  nodeId: string,
  now: number,
) {
  if (player.hitpoints <= 0 || player.reconnecting) {
    throw new Error('You cannot gather while dead or disconnected.');
  }

  const node = resourceNodes({ ...player, y: player.y + COLLISION.feetOffset }, GATHER_RANGE).find(
    (n) => {
      return n.id === nodeId;
    },
  );

  if (!node) {
    throw new Error('Move closer to this resource.');
  }

  if (resourceState(states, node, now)?.remaining === 0) {
    throw new Error('This resource is restoring.');
  }

  return node;
}
