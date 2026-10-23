import type { Player, ResourceState } from '@emberfall/common';
import { ARENA, TREES, ROCKS, PLANTS } from './world.ts';
import { FOREST, forestTrees, wrappedDelta } from './scene.ts';
import { addItem } from './inventory.ts';
import { PLANT_KINDS } from './plants.ts';

export const GATHER_RANGE = 65;
export const RESOURCE_RESTORE_MS = 60 * 60 * 1000;
export const GATHER_INTERVAL_MS = 400;
export interface ResourceNode {
  id: string;
  kind: 'tree' | 'plant' | 'rock' | 'stone';
  x: number;
  y: number;
  size: number;
  variant?: number;
}
// The original tree positions and identities remain stable.
const villageNodes: ResourceNode[] = TREES.map((tree, i) => ({
  ...tree,
  y: tree.y - 8,
  id: `tree:${i}`,
  kind: 'tree',
}));
ROCKS.forEach((rock, i) =>
  villageNodes.push({ ...rock, id: `rock:${i}`, kind: i % 2 ? 'stone' : 'rock' }),
);
PLANTS.forEach((plant, i) => villageNodes.push({ ...plant, id: `plant:${i}`, kind: 'plant' }));
export const VILLAGE_RESOURCES: readonly ResourceNode[] = Object.freeze(
  villageNodes.map((node) => Object.freeze(node)),
);

/** Queries return the nearest wrapped image; identities do not depend on camera position. */
export function resourceNodes(
  player: { x: number; y: number; scene?: string },
  radius: number,
): ResourceNode[] {
  const forest = player.scene === 'forest';
  const geometry = forest ? FOREST : ARENA;
  const nodes: readonly ResourceNode[] = forest
    ? forestTrees(player.x, player.y, radius + 180).flatMap((tree) => [
        { ...tree, kind: 'tree' as const },
        {
          id: `${tree.id}:plant`,
          kind: 'plant' as const,
          x: tree.x + 65,
          y: tree.y + 45,
          size: 32,
        },
        { id: `${tree.id}:rock`, kind: 'rock' as const, x: tree.x - 55, y: tree.y + 65, size: 40 },
        {
          id: `${tree.id}:stone`,
          kind: 'stone' as const,
          x: tree.x + 45,
          y: tree.y - 65,
          size: 26,
        },
      ])
    : VILLAGE_RESOURCES;
  return nodes
    .map((node) => ({
      ...node,
      x: player.x + wrappedDelta(node.x, player.x, geometry.width),
      y: player.y + wrappedDelta(node.y, player.y, geometry.height),
    }))
    .filter((node) => Math.hypot(node.x - player.x, node.y - player.y) <= radius);
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
  if (player.hitpoints <= 0) return undefined;
  return resourceNodes({ ...player, y: player.y + 15 }, GATHER_RANGE)
    .filter((node) => resourceState(states, node, now)?.remaining !== 0)
    .sort(
      (a, b) =>
        Math.hypot(a.x - player.x, a.y - player.y - 15) -
        Math.hypot(b.x - player.x, b.y - player.y - 15),
    )[0];
}
const lastGather = new WeakMap<Player, number>();
export function gatherResource(
  player: Player,
  states: Record<string, ResourceState>,
  nodeId: string,
  now: number,
  roll: () => number = Math.random,
) {
  if (player.hitpoints <= 0) throw new Error('You cannot gather while dead.');
  if (now - (lastGather.get(player) ?? -Infinity) < GATHER_INTERVAL_MS)
    throw new Error('Wait before gathering again.');
  const node = resourceNodes({ ...player, y: player.y + 15 }, GATHER_RANGE).find(
    (n) => n.id === nodeId,
  );
  if (!node) throw new Error('Move closer to this resource.');
  const previous = resourceState(states, node, now);
  const remaining = previous?.remaining ?? (node.kind === 'tree' ? 5 : 1);
  if (!remaining) throw new Error('This resource is restoring.');
  const items =
    node.kind === 'tree'
      ? (
          [
            ['log', 0.8],
            ['stick', 0.4],
            ['leaf', 0.2],
          ] as const
        )
          .filter(([, chance]) => roll() < chance)
          .map(([id]) => id)
      : [node.kind === 'plant' ? (PLANT_KINDS[node.variant!] ?? 'plant') : node.kind];
  // Commit only after every drop has fitted, including multi-drop tree gathers.
  const backpack = (player.backpack ?? []).map((item) => ({ ...item }));
  for (const itemId of items) addItem(backpack, { id: crypto.randomUUID(), itemId, quantity: 1 });
  player.backpack = backpack;
  states[node.id] = {
    remaining: remaining - 1,
    restoresAt:
      remaining === 1
        ? now + RESOURCE_RESTORE_MS
        : (previous?.restoresAt ?? now + RESOURCE_RESTORE_MS),
  };
  lastGather.set(player, now);
  return items;
}
export function restoreResources(states: Record<string, ResourceState> | undefined, now: number) {
  for (const [id, state] of Object.entries(states ?? {}))
    if (state.restoresAt <= now) delete states![id];
}
