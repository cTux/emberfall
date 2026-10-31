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
import { createForestGround } from './forest-ground';

import { companionCaster } from './companion';
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
import { castShadow } from './lighting';
import type { Caster } from './lighting';
import { dayNight } from './day-night';
import { lightTexture } from './light-texture';
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
    const scale = Math.max(ctx.canvas.width / 960, ctx.canvas.height / 640),
      width = ctx.canvas.width / scale,
      height = ctx.canvas.height / scale;
    const me = world?.players.find((p) => {
      return p.id === playerId;
    });
    const focus = me ?? { x: 2400 + Math.sin(now / 25000) * 70, y: 1280 };
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
    for (let row = Math.floor(cameraY / 320); row <= (cameraY + height) / 320; row++) {
      for (let col = Math.floor(cameraX / 320); col <= (cameraX + width) / 320; col++) {
        ctx.drawImage(terrain, col * 320, row * 320);
      }
    }

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
      Math.hypot(width, height) / 2 + 300,
    ).filter((t) => {
      return (
        t.x > cameraX - 300 &&
        t.x < cameraX + width + 300 &&
        t.y > cameraY - 300 &&
        t.y < cameraY + height + 300
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

    for (const player of players) {
      if (!player.bear) {
        continue;
      }

      const point = near(player.bear.x, player.bear.y);
      const caster = companionCaster(
        player.bear,
        point.x,
        point.y,
        serverTime,
        `bear:${player.id}`,
      );
      if (caster) {
        casters.push(caster);
      }
    }

    if (quality.shadows) {
      for (const caster of casters) {
        castShadow(ctx, caster);
      }
    }

    if (!quality.shadows) {
      ctx.fillStyle = '#07120955';
      for (const t of trees) {
        ctx.beginPath();
        ctx.ellipse(t.x, t.y, 23, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

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
        localActor.y + 15 - (localActor.size * 45) / 48 + localActor.size * (1 - breath),
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
      renderer.occlusion = !!localActor && layer.y > localActor.y + 15;
      drawForestLayer(ctx, layer, actorFrame);
    }

    renderer.occlusion = false;
    if (quality.lighting) {
      ctx.save();
      ctx.globalAlpha = cycle.lightAlpha;
      ctx.globalCompositeOperation = 'screen';
      for (const p of rendered.filter((a) => {
        return a.player && a.player.hitpoints > 0;
      })) {
        const light = {
          x: p.x + (p.facing === 2 ? -15 : 12),
          y: p.y + 15,
          height: 28,
          radius: 110,
          strength: 0.18,
          owner: p.id,
        };
        ctx.drawImage(lightTexture(light, casters, quality.shadows), light.x - 110, light.y - 110);
      }

      ctx.restore();
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
