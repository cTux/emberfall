import type { forestLayers } from './forest-layer-settings.ts';
import { type ActorFrame, drawForestActor } from './forest-actor-rendering';
import type { ForestProjection } from './forest-actors';
import { type InteractionTarget, drawInteractionOutline } from './interaction-targets';
import type { DamageEvent } from '@emberfall/common';
import type { WorldDrawingContext } from './rendering/drawing-context';
import { drawPortal } from './portal';
import { drawCritter } from './critters';
import { drawCompanion } from './companion';
import { resourceState } from '@emberfall/core';
import { resourceScenery, drawResourceHealth } from './gathering';
import { drawVegetation } from './effects';

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
