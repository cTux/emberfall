import type { ResourceNode } from './resource-node.ts';
import { VILLAGE_RESOURCES } from './village-resources.ts';
import type { DimensionId } from '@emberfall/common';
import { FOREST, forestTrees, wrappedDelta } from './scene.ts';
import { ARENA } from './world.ts';
import { FOREST_RESOURCE_QUERY_PADDING, FOREST_RESOURCE_LAYOUT } from './gathering-rules.ts';

/** Queries return the nearest wrapped image; identities do not depend on camera position. */
export function resourceNodes(
  player: { x: number; y: number; scene?: string; dimension?: DimensionId },
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
      return forest && player.dimension && player.dimension !== 'forest'
        ? { ...node, id: `${player.dimension}:${node.id}`, dimension: player.dimension }
        : node;
    })
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
