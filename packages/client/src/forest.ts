import { drawForestShadows, drawForestPlayerLights } from './forest-lighting.ts';
import { drawEnvironment } from './environment-rendering';
import { createForestActors, forestActorMask } from './forest-actors';
import { forestLayers, drawForestLayer } from './forest-layers';
export { portalInteraction, drawPortal } from './portal';
export { drawFog } from './fog';
export { drawPlayerDetails, drawPlayerAttack } from './player-rendering';

import { drawPlayerAttack } from './player-rendering';
import type { WorldDrawingContext } from './rendering/drawing-context';
import { abilityEffectOpacity } from './ability-effects';

import { resourceNodes, resourceState, FOREST } from '@emberfall/core';
import { resourceScenery } from './gathering';

import { idleBreath } from './animation';
import { createForestGround, drawForestGround } from './forest-ground';

import { companionShadows } from './companion-shadows';
import { critterCaster, crittersAt } from './critters';
import { drawNavigation } from './navigation';
import { drawHitboxes } from './hitboxes';

import type { InteractionTarget } from './interaction-targets';
import { bloodPuddleRenderer, drawLootAndBlood, drawClassProjectiles } from './combat-effects';
import { wrappedDelta } from '@emberfall/common';

import { drawDanger } from './danger';
import type { WorldState } from '@emberfall/common';
import type { GraphicsSettings } from './graphics';
import type { Preferences } from './preferences';
import type { Caster } from './lighting';
import { dayNight } from './day-night';
import { drawChatBubble, drawDamageFlash } from './effects';

export function forestRenderer(
  _nature: HTMLImageElement,
  _knight: HTMLImageElement,
  skeleton: HTMLImageElement,
) {
  const prepareActors = createForestActors(skeleton);
  const forestGround = createForestGround();
  const drawBloodPuddles = bloodPuddleRenderer();

  return (
    ctx: WorldDrawingContext,
    world: WorldState | null,
    playerId: string,
    quality: GraphicsSettings,
    prefs: Preferences,
    now: number,
    _dt: number,
    outlines: readonly InteractionTarget[],
    highlightInteractions: boolean,
  ) => {
    const serverTime = world?.scene?.pausedAt ?? world?.serverNow ?? 0;
    const cycle = dayNight(world?.serverNow ?? 0);
    ctx.ambientTint = cycle.tint;
    ctx.directionalShadow = cycle.shadow;
    const terrain = forestGround();
    const scale = Math.max(
        ctx.canvas.width / FOREST_VIEW.width,
        ctx.canvas.height / FOREST_VIEW.height,
      ),
      width = ctx.canvas.width / scale,
      height = ctx.canvas.height / scale;
    const me = world?.players.find((p) => {
      return p.id === playerId;
    });
    const focus = me ?? {
      x: FOREST_VIEW.demoX + Math.sin(now / FOREST_VIEW.demoSwayMs) * FOREST_VIEW.demoSway,
      y: FOREST_VIEW.demoY,
    };
    const cx = focus.x,
      cy = focus.y;
    const cameraX = cx - width / 2,
      cameraY = cy - height / 2;
    const near = (x: number, y: number) => {
      return {
        x: cx + wrappedDelta(x, cx, FOREST.width),
        y: cy + wrappedDelta(y, cy, FOREST.height),
      };
    };

    ctx.setTransform(scale, 0, 0, scale, -cameraX * scale, -cameraY * scale);
    ctx.imageSmoothingEnabled = false;

    drawForestGround(ctx, terrain, cameraX, cameraY, width, height);

    if (world?.scene) {
      drawClassProjectiles(ctx, world.scene, serverTime, near, quality.particles, prefs, playerId);
      drawDanger(ctx, world.scene, serverTime, near, true);
    }

    const players =
      world?.players.filter((p) => {
        return p.scene === 'forest' && p.runId === me?.runId;
      }) ?? [];

    for (const player of players) {
      const point = near(player.x, player.y);
      drawPlayerAttack(
        ctx,
        player,
        point.x,
        point.y,
        player.id === playerId ? now : serverTime,
        quality.bloom,
        world?.scene?.phase === 'active',
        abilityEffectOpacity(prefs, playerId, player.id),
      );
    }

    drawBloodPuddles(ctx, world?.scene, serverTime, prefs.bloodPuddles, near, {
      x: cameraX,
      y: cameraY,
      width,
      height,
    });
    const trees = resourceNodes(
      { x: cx, y: cy, scene: 'forest' },
      Math.hypot(width, height) / 2 + FOREST_VIEW.sceneryMargin,
    ).filter((t) => {
      return (
        t.x > cameraX - FOREST_VIEW.sceneryMargin &&
        t.x < cameraX + width + FOREST_VIEW.sceneryMargin &&
        t.y > cameraY - FOREST_VIEW.sceneryMargin &&
        t.y < cameraY + height + FOREST_VIEW.sceneryMargin
      );
    });
    const casters: Caster[] = trees.map((node) => {
      return resourceScenery(node, resourceState(world?.resources, node, serverTime));
    });
    const {
      rendered,
      casters: actorCasters,
      damageByTarget,
    } = prepareActors(world, players, playerId, { cx, cy, width, height, near }, now, serverTime);
    casters.push(...actorCasters);
    const critters = crittersAt('forest', world ? serverTime : now, {
      x: cameraX,
      y: cameraY,
      width,
      height,
    });

    for (const critter of critters) {
      const caster = critterCaster(critter);

      if (caster) {
        casters.push(caster);
      }
    }

    casters.push(...companionShadows(players, serverTime, near));

    drawForestShadows(ctx, casters, trees, quality.shadows);

    if (world?.scene) {
      drawDanger(ctx, world.scene, serverTime, near);
    }

    if (world?.scene) {
      drawLootAndBlood(ctx, world.scene, serverTime, near, {
        x: cameraX,
        y: cameraY,
        width,
        height,
      });
    }

    const layers = forestLayers(world, trees, rendered, players, critters, near);
    const renderer = ctx;
    const localActor = rendered.find((actor) => {
      return actor.id === playerId;
    });

    if (localActor && localActor.image.naturalWidth) {
      const breath = idleBreath(now, localActor.row);
      renderer.setPlayerCutout(
        forestActorMask(localActor.image, localActor.facing, localActor.row),
        localActor.x - localActor.size / 2,
        localActor.y +
          FOREST_ACTOR.footOffset -
          (localActor.size * FOREST_ACTOR.bodyHeight) / FOREST_ACTOR.playerSize +
          localActor.size * (1 - breath),
        localActor.size,
        localActor.size * breath,
      );
    }

    const actorFrame = {
      world,
      players,
      playerId,
      now,
      serverTime,
      quality,
      highlightInteractions,
      near,
      outlines,
      damageByTarget,
    };

    for (const layer of layers) {
      renderer.occlusion = !!localActor && layer.y > localActor.y + FOREST_ACTOR.footOffset;
      drawForestLayer(ctx, layer, actorFrame);
    }

    renderer.occlusion = false;

    if (quality.lighting) {
      drawForestPlayerLights(ctx, rendered, casters, cycle.lightAlpha, quality.shadows);
    }

    drawEnvironment(ctx, { x: cameraX, y: cameraY, width, height }, now, quality, cycle.daylight);

    if (prefs.damageNumbers) {
      drawDamageNumbers(
        ctx,
        world?.scene?.damage ?? [],
        near,
        serverTime,
        prefs.hideOtherPlayerDamageNumbers ? playerId : undefined,
      );
    }

    drawDamageFlash(ctx, world, playerId);

    if (world) {
      drawNavigation(ctx, world, playerId);
    }

    for (const player of players) {
      const point = near(player.x, player.y);
      drawChatBubble(ctx, point.x, point.y, player.chat);
    }

    ctx.canvas.dataset.debugHitboxes = String(
      prefs.debugHitboxes && world
        ? drawHitboxes(ctx, world, true, { x: cameraX, y: cameraY, width, height })
        : 0,
    );
  };
}

import { drawDamageNumbers } from './damage-text';

import { FOREST_ACTOR, FOREST_VIEW } from './forest-calibration.ts';
