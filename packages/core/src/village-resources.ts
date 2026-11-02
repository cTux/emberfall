import type { ResourceNode } from './resource-node.ts';
import { villageNodes } from './village-nodes.ts';

export const VILLAGE_RESOURCES: readonly ResourceNode[] = Object.freeze(
  villageNodes.map((node) => {
    return Object.freeze(node);
  }),
);
