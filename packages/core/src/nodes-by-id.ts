import { TALENT_TREE } from './talent-tree-nodes.ts';

export const nodesById = new Map(
  TALENT_TREE.map((node) => {
    return [node.id, node];
  }),
);
