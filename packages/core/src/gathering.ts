import { COLLISION } from './definitions/collision.ts';
import { VILLAGE_TREE } from './village-layout.ts';
import {
  FOREST_RESOURCE_LAYOUT,
  FOREST_RESOURCE_QUERY_PADDING,
  TREE_GATHER_COUNT,
  TREE_DROPS,
} from './gathering-rules.ts';
import type { Player, ResourceState } from '@emberfall/common';
import { ARENA, TREES, ROCKS, PLANTS } from './world.ts';
import { FOREST, forestTrees, wrappedDelta } from './scene.ts';
import { addItem } from './inventory.ts';
import { PLANT_KINDS } from './plants.ts';
import { startTimedActivity } from './timed-activity.ts';

// Existing sixty-five-pixel reach lets players gather beside resource artwork rather than overlap it.
export const GATHER_RANGE = 65;
// An exhausted node regenerates after one hour, preserving the established resource supply cadence.
export const RESOURCE_RESTORE_MS = 3_600_000;
// Existing five-second base duration leaves room for the optional two-second timing bonus.
export const GATHER_DURATION_MS = 5000;
export interface ResourceNode {
  id: string;
  kind: 'tree' | 'plant' | 'rock' | 'stone';
  x: number;
  y: number;
  size: number;
  variant?: number;
}
// The original tree positions and identities remain stable.
const villageNodes: ResourceNode[] = TREES.map((tree, i) => {
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
export const VILLAGE_RESOURCES: readonly ResourceNode[] = Object.freeze(
  villageNodes.map((node) => {
    return Object.freeze(node);
  }),
);

/** Queries return the nearest wrapped image; identities do not depend on camera position. */
export function resourceNodes(
  player: { x: number; y: number; scene?: string },
  radius: number,
): ResourceNode[] {
  const forest = player.scene === 'forest';
  const geometry = forest ? FOREST : ARENA;
  const nodes: readonly ResourceNode[] = forest
    ? forestTrees(player.x, player.y, radius + FOREST_RESOURCE_QUERY_PADDING).flatMap((tree) => {
        return [
          { ...tree, kind: 'tree' as const },
          {
            id: `${tree.id}:plant`,
            kind: 'plant' as const,
            x: tree.x + FOREST_RESOURCE_LAYOUT.plant.x,
            y: tree.y + FOREST_RESOURCE_LAYOUT.plant.y,
            size: FOREST_RESOURCE_LAYOUT.plant.size,
          },
          {
            id: `${tree.id}:rock`,
            kind: 'rock' as const,
            x: tree.x + FOREST_RESOURCE_LAYOUT.rock.x,
            y: tree.y + FOREST_RESOURCE_LAYOUT.rock.y,
            size: FOREST_RESOURCE_LAYOUT.rock.size,
          },
          {
            id: `${tree.id}:stone`,
            kind: 'stone' as const,
            x: tree.x + FOREST_RESOURCE_LAYOUT.stone.x,
            y: tree.y + FOREST_RESOURCE_LAYOUT.stone.y,
            size: FOREST_RESOURCE_LAYOUT.stone.size,
          },
        ];
      })
    : VILLAGE_RESOURCES;

  return nodes
    .map((node) => {
      return {
        ...node,
        x: player.x + wrappedDelta(node.x, player.x, geometry.width),
        y: player.y + wrappedDelta(node.y, player.y, geometry.height),
      };
    })
    .filter((node) => {
      return Math.hypot(node.x - player.x, node.y - player.y) <= radius;
    });
}

export function resourceState(
  states: Record<string, ResourceState> | undefined,
  node: ResourceNode,
  now: number,
) {
  const state = states?.[node.id];

  return state && state.restoresAt > now ? state : undefined;
}

export function nearbyResource(
  player: Pick<Player, 'x' | 'y' | 'scene' | 'hitpoints'>,
  states: Record<string, ResourceState> | undefined,
  now: number,
) {
  if (player.hitpoints <= 0) {
    return undefined;
  }

  return resourceNodes({ ...player, y: player.y + COLLISION.feetOffset }, GATHER_RANGE)
    .filter((node) => {
      return resourceState(states, node, now)?.remaining !== 0;
    })
    .sort((a, b) => {
      return (
        Math.hypot(a.x - player.x, a.y - player.y - COLLISION.feetOffset) -
        Math.hypot(b.x - player.x, b.y - player.y - COLLISION.feetOffset)
      );
    })[0];
}

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

export function gatherResource(
  player: Player,
  states: Record<string, ResourceState>,
  nodeId: string,
  now: number,
  roll: () => number = Math.random,
) {
  const node = gatheringNode(player, states, nodeId, now);
  const previous = resourceState(states, node, now);
  const remaining = previous?.remaining ?? (node.kind === 'tree' ? TREE_GATHER_COUNT : 1);

  if (!remaining) {
    throw new Error('This resource is restoring.');
  }

  const items =
    node.kind === 'tree'
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

export function restoreResources(states: Record<string, ResourceState> | undefined, now: number) {
  for (const [id, state] of Object.entries(states ?? {})) {
    if (state.restoresAt <= now) {
      delete states![id];
    }
  }
}
