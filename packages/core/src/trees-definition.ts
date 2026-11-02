import type { Tree } from './tree.ts';
import { trees } from './trees.ts';

export const TREES: readonly Readonly<Tree>[] = Object.freeze(
  trees.map((tree) => {
    return Object.freeze(tree);
  }),
);
