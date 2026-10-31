import type { VillageLayer } from './village-layers';
import type { DamageEvent } from '@emberfall/common';
import type { InteractionTarget } from './interaction-targets';
import type { WorldDrawingContext } from './rendering/drawing-context';
import type { VillageActorFrame } from './village-players';
import { environmentArt, wardrobeArt, drawArt } from './art';
import { spriteMask } from './lighting';
import { drawTargetHit, drawVegetation, drawCharacterName, drawNameBadge } from './effects';
import { drawWorldBar } from './world-bar';
import { drawDebuffs } from './combat-effects';
import { drawPortal } from './portal';
import { drawCritter } from './critters';
import { drawCompanion } from './companion';
import { drawInteractionOutline } from './interaction-targets';
import { drawTorchFire } from './village';
import { drawNpcWork } from './npc-work';
import { drawChimneySmoke } from './ambient-art';
import { resourceState } from '@emberfall/core';
import { drawResourceHealth } from './gathering';

type LayerFrame = VillageActorFrame & {
  portal: { x: number; y: number };
  portalTarget: InteractionTarget;
  outlines: readonly InteractionTarget[];
  damageByTarget: ReadonlyMap<string, DamageEvent>;
  wardrobeOpen: boolean;
  wardrobeOpenedAt: number;
};
export function drawVillageLayer(ctx: WorldDrawingContext, layer: VillageLayer, frame: LayerFrame) {
  const {
    view,
    now,
    serverTime,
    quality,
    preferences,
    portal,
    portalTarget,
    outlines,
    damageByTarget,
    wardrobeOpen,
    wardrobeOpenedAt,
  } = frame;
  if (layer.dummy) {
    const dummy = layer.dummy;
    if (environmentArt.naturalWidth) {
      drawArt(ctx, environmentArt, 1, 2, dummy.x - 24, dummy.y - 30, 48, 48, 128);
      const hit = damageByTarget.get(`enemy:${dummy.id}`);
      if (hit)
        drawTargetHit(
          ctx,
          spriteMask(environmentArt, 1, 2, false, 128, false, 128)!,
          dummy.x - 24,
          dummy.y - 30,
          48,
          48,
          serverTime - hit.at,
        );
    }

    ctx.globalAlpha = 1;
    ctx.occlusion = false;
    if (!preferences.hideHealthBarsInTown)
      drawWorldBar(
        ctx,
        dummy.x - 20,
        dummy.y - 41,
        40,
        dummy.hitpoints / dummy.maxHitpoints!,
        '#df7765',
      );
    drawDebuffs(ctx, dummy, dummy.x - 20, dummy.y - 52, serverTime);

    return;
  }

  if (layer.portal) {
    drawPortal(
      ctx,
      portal.x,
      portal.y,
      now,
      quality.bloom,
      null,
      outlines.includes(portalTarget) ? portalTarget : null,
      quality.shadows,
      quality.wavingVegetation,
    );

    return;
  }

  if (layer.critter) {
    drawCritter(ctx, layer.critter, quality.shadows);
    const outline = outlines.find((target) => target.source.id === layer.critter.id);
    if (outline) drawInteractionOutline(ctx, outline);
    ctx.globalAlpha = 1;

    return;
  }

  if (layer.bear) {
    drawCompanion(
      ctx,
      layer.bear,
      layer.bear.x,
      layer.bear.y,
      view?.serverNow ?? now,
      quality.shadows,
      1,
      !preferences.hideHealthBarsInTown,
    );

    return;
  }

  if (layer.object) {
    const object = layer.object;

    const vegetation =
      !object.gathered && (object.id.startsWith('tree:') || object.id.startsWith('plant:'));
    if (vegetation)
      drawVegetation(
        ctx,
        object.sprite,
        object.x,
        object.y,
        object.width,
        object.height,
        now,
        quality.wavingVegetation,
      );
    else if (object.id === 'building:wardrobe') {
      const open = wardrobeOpen;
      drawArt(
        ctx,
        wardrobeArt,
        open ? Math.min(3, Math.floor((now - wardrobeOpenedAt) / 100)) : 0,
        0,
        object.x - object.width / 2,
        object.y - object.height,
        object.width,
        object.height,
        128,
      );
    } else if (object.id.startsWith('torch:'))
      drawTorchFire(ctx, object.x, object.y, now, quality.particles, quality.bloom);
    else
      ctx.drawImage(
        object.sprite,
        object.x - object.width / 2,
        object.y - object.height,
        object.width,
        object.height,
      );
    if (object.npc?.workstationId)
      drawNpcWork(ctx, object.npc, object.x, object.y, serverTime, quality.particles);
    const outline = outlines.find(
      (target) =>
        target.source.id === object.id.replace(/^(building|npc|workstation):/, '') ||
        target.source.id === `gather:${object.id}`,
    );
    if (outline) drawInteractionOutline(ctx, outline);
    if (object.chimney && quality.particles)
      drawChimneySmoke(ctx, object.x + object.chimney.x, object.y + object.chimney.y, now);
    ctx.globalAlpha = 1;
    if (object.id.startsWith('tree:') && !preferences.hideHealthBarsInTown)
      drawResourceHealth(
        ctx,
        { ...object, kind: 'tree', size: object.width },
        resourceState(
          view.resources,
          { ...object, kind: 'tree', size: object.width },
          view.serverNow ?? now,
        ),
      );
    if (object.name && object.npc)
      drawCharacterName(
        ctx,
        object.x,
        object.y - object.height - 9,
        object.name,
        object.npc?.silenced ? '#ff8794' : undefined,
      );
    else if (object.name) drawNameBadge(ctx, object.x, object.y, object.name);

    return;
  }
}
