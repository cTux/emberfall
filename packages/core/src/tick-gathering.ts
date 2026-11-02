import { gatheringNode } from './gathering-node.ts';
import { gatherResource } from './gather-resource.ts';
import type { Player, ResourceState } from '@emberfall/core/contracts';

export function tickGathering(
  player: Player,
  states: Record<string, ResourceState>,
  epoch: string,
  now: number,
) {
  const activity = player.gathering;

  if (!activity) {
    return;
  }

  try {
    if (activity.epoch !== epoch) {
      throw new Error('Area changed.');
    }

    gatheringNode(player, states, activity.nodeId, now);
  } catch {
    delete player.gathering;

    return;
  }

  if (now < activity.endsAt) {
    return;
  }

  delete player.gathering;

  return gatherResource(player, states, activity.nodeId, now);
}
