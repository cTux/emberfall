import { gatheringNode } from './gathering-node.ts';
import { GATHER_DURATION_MS } from './gather-duration-ms.ts';
import type { Player, ResourceState } from '@emberfall/common';
import { startTimedActivity } from './timed-activity.ts';

// Existing sixty-five-pixel reach lets players gather beside resource artwork rather than overlap it.

export function startGathering(
  player: Player,
  states: Record<string, ResourceState> | undefined,
  nodeId: string,
  epoch: string,
  now: number,
) {
  gatheringNode(player, states, nodeId, now);
  player.gathering = { ...startTimedActivity(now, GATHER_DURATION_MS), nodeId, epoch };
}
