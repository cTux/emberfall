import type { Player, WorldState, DamageEvent } from '@emberfall/common';
import { type resourceNodes, resourceState } from '@emberfall/core';
import type { WorldDrawingContext } from './rendering/drawing-context';
import type { ForestActor, ForestProjection } from './forest-actors';
import { drawForestActor, type ActorFrame } from './forest-actor-rendering';
import { drawPortal } from './portal';
import { resourceScenery, drawResourceHealth } from './gathering';
import { drawVegetation } from './effects';
import { drawInteractionOutline, type InteractionTarget } from './interaction-targets';
import { drawCompanion } from './companion';
import { type crittersAt, drawCritter } from './critters';

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
        y: near(portal.x, portal.y).y + 8,
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
        y: a.y + 15,
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
              y: near(p.bear.x, p.bear.y).y + 18,
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

type LayerFrame = ActorFrame & {
  near: ForestProjection['near'];
  outlines: readonly InteractionTarget[];
  damageByTarget: ReadonlyMap<string, DamageEvent>;
};
export function drawForestLayer(
  ctx: WorldDrawingContext,
  layer: ReturnType<typeof forestLayers>[number],
  frame: LayerFrame,
) {
  const { world, near, now, serverTime, quality, outlines, damageByTarget } = frame;

  if (layer.portal) {
    const portal = layer.portal;
    const point = near(portal.x, portal.y);
    drawPortal(
      ctx,
      point.x,
      point.y,
      now,
      quality.bloom,
      'Return to village',
      outlines.find((target) => {
        return (
          target.source.id === 'return' &&
          target.source.x === portal.x &&
          target.source.y === portal.y
        );
      }) ?? null,
      quality.shadows,
      quality.wavingVegetation,
    );

    return;
  }

  if (layer.critter) {
    drawCritter(ctx, layer.critter, quality.shadows);
    ctx.globalAlpha = 1;

    return;
  }

  if (layer.bear) {
    const point = near(layer.bear.x, layer.bear.y);
    drawCompanion(ctx, layer.bear, point.x, point.y, serverTime, quality.shadows);

    return;
  }

  if (layer.tree) {
    const t = layer.tree;

    const state = resourceState(world?.resources, t, serverTime);
    const object = resourceScenery(t, state);

    if ((t.kind === 'tree' || t.kind === 'plant') && state?.remaining !== 0) {
      drawVegetation(
        ctx,
        object.sprite,
        t.x,
        t.y,
        object.width,
        object.height,
        now,
        quality.wavingVegetation,
      );
    } else {
      ctx.drawImage(
        object.sprite,
        t.x - object.width / 2,
        t.y - object.height,
        object.width,
        object.height,
      );
    }

    ctx.globalAlpha = 1;
    ctx.occlusion = false;
    drawResourceHealth(ctx, t, state);
    const outline = outlines.find((target) => {
      return target.source.id === `gather:${t.id}`;
    });

    if (outline) {
      drawInteractionOutline(ctx, outline);
    }

    return;
  }

  const actor = layer.actor;
  drawForestActor(ctx, actor, damageByTarget.get(actor.id), frame);
}
