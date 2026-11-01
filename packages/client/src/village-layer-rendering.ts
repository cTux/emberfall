import { TRAINING_TARGET_ART, WARDROBE_ANIMATION } from './village-art-layout.ts';

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

// A nine-unit gap keeps NPC names just above the sprite instead of touching the head.
const NPC_NAME_GAP = 9;

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
      drawArt(
        ctx,
        environmentArt,
        TRAINING_TARGET_ART.column,
        TRAINING_TARGET_ART.row,
        dummy.x - TRAINING_TARGET_ART.left,
        dummy.y - TRAINING_TARGET_ART.top,
        TRAINING_TARGET_ART.width,
        TRAINING_TARGET_ART.height,
        TRAINING_TARGET_ART.cell,
      );
      const hit = damageByTarget.get(`enemy:${dummy.id}`);

      if (hit) {
        drawTargetHit(
          ctx,
          spriteMask(
            environmentArt,
            TRAINING_TARGET_ART.column,
            TRAINING_TARGET_ART.row,
            false,
            TRAINING_TARGET_ART.cell,
            false,
            TRAINING_TARGET_ART.cell,
          )!,
          dummy.x - TRAINING_TARGET_ART.left,
          dummy.y - TRAINING_TARGET_ART.top,
          TRAINING_TARGET_ART.width,
          TRAINING_TARGET_ART.width,
          serverTime - hit.at,
        );
      }
    }

    ctx.globalAlpha = 1;
    ctx.occlusion = false;

    if (!preferences.hideHealthBarsInTown) {
      drawWorldBar(
        ctx,
        dummy.x - TRAINING_TARGET_ART.barLeft,
        dummy.y - TRAINING_TARGET_ART.barTop,
        TRAINING_TARGET_ART.barWidth,
        dummy.hitpoints / dummy.maxHitpoints!,
        '#df7765',
      );
    }

    drawDebuffs(
      ctx,
      dummy,
      dummy.x - TRAINING_TARGET_ART.barLeft,
      dummy.y - TRAINING_TARGET_ART.debuffsTop,
      serverTime,
    );

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
    const outline = outlines.find((target) => {
      return target.source.id === layer.critter.id;
    });

    if (outline) {
      drawInteractionOutline(ctx, outline);
    }

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

    if (vegetation) {
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
    } else if (object.id === 'building:wardrobe') {
      const open = wardrobeOpen;
      drawArt(
        ctx,
        wardrobeArt,
        open
          ? Math.min(
              WARDROBE_ANIMATION.lastFrame,
              Math.floor((now - wardrobeOpenedAt) / WARDROBE_ANIMATION.frameMs),
            )
          : 0,
        0,
        object.x - object.width / 2,
        object.y - object.height,
        object.width,
        object.height,
        WARDROBE_ANIMATION.cell,
      );
    } else if (object.id.startsWith('torch:')) {
      drawTorchFire(ctx, object.x, object.y, now, quality.particles, quality.bloom);
    } else {
      ctx.drawImage(
        object.sprite,
        object.x - object.width / 2,
        object.y - object.height,
        object.width,
        object.height,
      );
    }

    if (object.npc?.workstationId) {
      drawNpcWork(ctx, object.npc, object.x, object.y, serverTime, quality.particles);
    }

    const outline = outlines.find((target) => {
      return (
        target.source.id === object.id.replace(/^(building|npc|workstation):/, '') ||
        target.source.id === `gather:${object.id}`
      );
    });

    if (outline) {
      drawInteractionOutline(ctx, outline);
    }

    if (object.chimney && quality.particles) {
      drawChimneySmoke(ctx, object.x + object.chimney.x, object.y + object.chimney.y, now);
    }

    ctx.globalAlpha = 1;

    if (object.id.startsWith('tree:') && !preferences.hideHealthBarsInTown) {
      drawResourceHealth(
        ctx,
        { ...object, kind: 'tree', size: object.width },
        resourceState(
          view.resources,
          { ...object, kind: 'tree', size: object.width },
          view.serverNow ?? now,
        ),
      );
    }

    if (object.name && object.npc) {
      drawCharacterName(
        ctx,
        object.x,
        object.y - object.height - NPC_NAME_GAP,
        object.name,
        object.npc?.silenced ? '#ff8794' : undefined,
      );
    } else if (object.name) {
      drawNameBadge(ctx, object.x, object.y, object.name);
    }

    return;
  }
}
