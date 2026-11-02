import type { WorldState, Player } from '@emberfall/common';
import type { resourceNodes } from '@emberfall/core';
import type { ForestActor, ForestProjection } from './forest-actors';
import type { crittersAt } from './critters';
import { FOREST_ACTOR } from './forest-calibration.ts';
// Existing layer anchors match the visible portal threshold and companion feet for stable painter ordering.
// Existing layer anchors match the visible portal threshold and companion feet for stable painter ordering.
const LAYER_ANCHOR = {
  portal: 8,
  companion: 18,
} as const;
export function forestLayers(
  world: WorldState | null,
  trees: ReturnType<typeof resourceNodes>,
  rendered: ForestActor[],
  players: Player[],
  critters: ReturnType<typeof crittersAt>,
  near: ForestProjection['near'],
) {
  return [
    ...(world?.scene?.phase === 'ended' ? world.scene.portals : []).map((portal) => {
      return {
        y: near(portal.x, portal.y).y + LAYER_ANCHOR.portal,
        tree: null,
        actor: null,
        bear: null,
        critter: null,
        portal,
      };
    }),
    ...trees.map((t) => {
      return {
        y: t.y,
        tree: t,
        actor: null,
        bear: null,
        critter: null,
        portal: null,
      };
    }),
    ...rendered.map((a) => {
      return {
        y: a.y + FOREST_ACTOR.footOffset,
        tree: null,
        actor: a,
        bear: null,
        critter: null,
        portal: null,
      };
    }),
    ...players.flatMap((p) => {
      return p.bear
        ? [
            {
              y: near(p.bear.x, p.bear.y).y + LAYER_ANCHOR.companion,
              tree: null,
              actor: null,
              bear: p.bear,
              critter: null,
              portal: null,
            },
          ]
        : [];
    }),
    ...critters.map((critter) => {
      return {
        y: critter.y,
        tree: null,
        actor: null,
        bear: null,
        critter,
        portal: null,
      };
    }),
  ].sort((a, b) => {
    return a.y - b.y;
  });
}
