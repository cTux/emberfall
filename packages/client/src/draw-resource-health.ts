import { RESOURCE_ART } from './resource-art.ts';
import type { DrawingContext } from './rendering/drawing-context';
import type { ResourceNode } from '@emberfall/core';
import type { ResourceState } from '@emberfall/common';
import { drawWorldBar } from './world-bar';

export function drawResourceHealth(ctx: DrawingContext, node: ResourceNode, state?: ResourceState) {
  if (
    node.kind !== 'tree' ||
    !state ||
    state.remaining <= 0 ||
    state.remaining >= RESOURCE_ART.treeHarvests
  ) {
    return;
  }

  drawWorldBar(
    ctx,
    node.x - 20,
    node.y - node.size - 4,
    40,
    state.remaining / RESOURCE_ART.treeHarvests,
    '#a4cf7b',
  );
}
