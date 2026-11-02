import type { ResourceNode } from './resource-node.ts';
import { TREES, ROCKS, PLANTS } from './world.ts';
import { VILLAGE_TREE } from './village-layout.ts';

// The original tree positions and identities remain stable.
export const villageNodes: ResourceNode[] = TREES.map((tree, i) => {
  return {
    ...tree,
    y: tree.y - VILLAGE_TREE.trunkOffsetY,
    id: `tree:${i}`,
    kind: 'tree',
  };
});

ROCKS.forEach((rock, i) => {
  return villageNodes.push({ ...rock, id: `rock:${i}`, kind: i % 2 ? 'stone' : 'rock' });
});

PLANTS.forEach((plant, i) => {
  return villageNodes.push({ ...plant, id: `plant:${i}`, kind: 'plant' });
});
