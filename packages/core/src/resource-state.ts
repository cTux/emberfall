import type { ResourceNode } from './resource-node.ts';
import type { ResourceState } from '@emberfall/common';

export function resourceState(
  states: Record<string, ResourceState> | undefined,
  node: ResourceNode,
  now: number,
) {
  const state = states?.[node.id];

  return state && state.restoresAt > now ? state : undefined;
}
