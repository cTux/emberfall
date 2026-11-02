import { gatheringNode } from './gathering-node.ts';
import { resourceState } from './resource-state.ts';
import { RESOURCE_RESTORE_MS } from './resource-restore-ms.ts';
import type { Player, ResourceState } from '@emberfall/common';
import { randomSource } from './random.ts';
import { TREE_GATHER_COUNT, TREE_DROPS } from './gathering-rules.ts';
import { dimensionDefinition } from './dimensions.ts';
import { PLANT_KINDS } from './plants.ts';
import { addItem } from './inventory.ts';

export function gatherResource(
  player: Player,
  states: Record<string, ResourceState>,
  nodeId: string,
  now: number,
  roll: () => number = randomSource.next,
) {
  const node = gatheringNode(player, states, nodeId, now);
  const previous = resourceState(states, node, now);
  const remaining = previous?.remaining ?? (node.kind === 'tree' ? TREE_GATHER_COUNT : 1);

  if (!remaining) {
    throw new Error('This resource is restoring.');
  }

  const dimension = node.dimension ? dimensionDefinition(node.dimension) : undefined;
  const items = dimension
    ? [dimension.resources[node.kind]]
    : node.kind === 'tree'
      ? Object.entries(TREE_DROPS)
          .filter(([, chance]) => {
            return roll() < chance;
          })
          .map(([id]) => {
            return id;
          })
      : [node.kind === 'plant' ? (PLANT_KINDS[node.variant!] ?? 'plant') : node.kind];
  // Commit only after every drop has fitted, including multi-drop tree gathers.
  const backpack = (player.backpack ?? []).map((item) => {
    return { ...item };
  });

  for (const itemId of items) {
    addItem(backpack, { id: crypto.randomUUID(), itemId, quantity: 1 });
  }

  player.backpack = backpack;
  states[node.id] = {
    remaining: remaining - 1,
    restoresAt:
      remaining === 1
        ? now + RESOURCE_RESTORE_MS
        : (previous?.restoresAt ?? now + RESOURCE_RESTORE_MS),
  };

  return items;
}
