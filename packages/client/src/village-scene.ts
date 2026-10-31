import type { Player, WorldState } from '@emberfall/common';
import { inTrainingZone } from '@emberfall/core';
import type { WorldDrawingContext } from './rendering/drawing-context';
import type { Preferences } from './preferences';
import type { GraphicsSettings } from './graphics';
import type { InteractionTarget } from './interaction-targets';
import type { dayNight } from './day-night';
import { prepareVillageFrame } from './village-frame';
import { VillagePlayers } from './village-players';
import { VillageSpeech } from './village-speech';
import { createCritterMotion } from './critter-motion';
import { villageLayers } from './village-layers';
import { drawVillageLayer } from './village-layer-rendering';
import { drawVillageBackground } from './village-background';
import { abilityEffectOpacity } from './ability-effects';
import { drawClassProjectiles, drawLootAndBlood } from './combat-effects';
import { drawPlayerAttack } from './player-rendering';
import { companionCaster } from './companion';
import { critterCaster } from './critters';
import { castShadow } from './lighting';
import { drawVillageLighting } from './village-lighting';
import { drawEnvironment } from './environment-rendering';
import { drawNavigation } from './navigation';
import { drawHitboxes } from './hitboxes';
import { drawDamageNumbers } from './damage-text';

type Options = {
  preferences: Preferences;
  cycle: ReturnType<typeof dayNight>;
  highlightInteractions: boolean;
  outlines: () => readonly InteractionTarget[];
  wardrobeOpen: boolean;
  wardrobeOpenedAt: number;
};

export class VillageScene {
  private players = new VillagePlayers();
  private speech: VillageSpeech;
  private critters = createCritterMotion();
  private playerId: string;
  constructor(playerId: string, onCatSpeech: (text: string) => void) {
    this.playerId = playerId;
    this.speech = new VillageSpeech(onCatSpeech);
  }
  clear() {
    this.players.clear();
  }
  prepare(
    view: WorldState,
    local: Player | undefined,
    now: number,
    quality: GraphicsSettings,
    viewport: { width: number; height: number; scale: number },
  ) {
    const frame = prepareVillageFrame(view, local, now, quality, viewport);
    const critters = this.critters(
      now,
      frame.camera,
      view.players.filter((player) => !player.scene && player.hitpoints > 0),
      view.serverNow ?? now,
    );
    return { ...frame, scale: viewport.scale, critters, cats: this.speech.targets(critters) };
  }
  draw(
    ctx: WorldDrawingContext,
    villageFrame: ReturnType<VillageScene['prepare']>,
    options: Options,
  ) {
    const {
      view,
      local,
      now,
      quality,
      background,
      visibleScenery,
      project,
      portal,
      portalTarget,
      critters,
      scale,
      camera: { x: cameraX, y: cameraY, width: viewWidth, height: viewHeight },
    } = villageFrame;
    const { preferences, cycle, highlightInteractions } = options;
    const playerId = this.playerId;
    ctx.setTransform(scale, 0, 0, scale, -cameraX * scale, -cameraY * scale);
    if (background) drawVillageBackground(ctx, background, cameraX, cameraY, viewWidth, viewHeight);
    else {
      ctx.fillStyle = '#25392f';
      ctx.fillRect(cameraX, cameraY, viewWidth, viewHeight);
    }
    const training = view.training
      ? {
          ...view.training,
          enemies: view.training.enemies.map((dummy) => ({
            ...dummy,
            ...project(dummy.x, dummy.y),
          })),
        }
      : undefined;
    const serverTime = view.serverNow ?? now;
    if (training) {
      drawClassProjectiles(
        ctx,
        training,
        serverTime,
        project,
        quality.particles,
        preferences,
        playerId,
      );
    }
    const players = view.players
      .filter((p) => !p.scene)
      .map((p) => ({
        ...p,
        ...project(p.x, p.y),
        bear: p.bear ? { ...p.bear, ...project(p.bear.x, p.bear.y) } : undefined,
      }));
    for (const player of players)
      drawPlayerAttack(
        ctx,
        player,
        player.x,
        player.y,
        player.id === playerId ? now : serverTime,
        quality.bloom,
        !!training && inTrainingZone(player),
        abilityEffectOpacity(preferences, playerId, player.id),
      );
    if (training)
      drawLootAndBlood(ctx, training, serverTime, project, {
        x: cameraX,
        y: cameraY,
        width: viewWidth,
        height: viewHeight,
      });
    // Use the reconciled positions consistently for bodies, lanterns and shadows.
    if (quality.shadows) for (const object of visibleScenery) castShadow(ctx, object);
    const dynamic = this.players.prepare(ctx, players, playerId, now, serverTime);
    for (const critter of critters) {
      const caster = critterCaster(critter);
      if (caster) dynamic.push(caster);
    }
    for (const player of players) {
      if (!player.bear) continue;
      const point = player.bear;
      const caster = companionCaster(
        player.bear,
        point.x,
        point.y,
        view.serverNow ?? now,
        `bear:${player.id}`,
      );
      if (caster) dynamic.push(caster);
    }
    if (quality.shadows) for (const caster of dynamic) castShadow(ctx, caster);
    const layers = villageLayers(visibleScenery, players, critters, training, portal);
    const outlines = options.outlines();
    const damageByTarget = new Map(training?.damage.map((hit) => [hit.target, hit]));
    const layerFrame = {
      view,
      local,
      playerId,
      now,
      serverTime,
      quality: quality,
      preferences: preferences,
      highlightInteractions,
      portal,
      portalTarget,
      outlines,
      damageByTarget,
      wardrobeOpen: options.wardrobeOpen,
      wardrobeOpenedAt: options.wardrobeOpenedAt,
    };
    for (const layer of layers) {
      ctx.occlusion = !!local && layer.y > local.y + 15;
      if (!layer.player) {
        drawVillageLayer(ctx, layer, layerFrame);
        continue;
      }
      this.players.draw(ctx, layer.player, layerFrame);
    }
    ctx.occlusion = false;
    if (training) {
      if (preferences.damageNumbers)
        drawDamageNumbers(
          ctx,
          training.damage,
          project,
          serverTime,
          preferences.hideOtherPlayerDamageNumbers ? playerId : undefined,
        );
    }
    drawVillageLighting(ctx, villageFrame, dynamic, players, this.players, cycle);
    drawEnvironment(ctx, villageFrame.camera, now, quality, cycle.daylight);
    drawNavigation(ctx, view, playerId);
    return { players, serverTime };
  }
  overlays(
    ctx: WorldDrawingContext,
    frame: ReturnType<VillageScene['prepare']>,
    drawn: { players: Player[]; serverTime: number },
    preferences: Preferences,
  ) {
    const {
      view,
      now,
      visibleScenery,
      critters,
      camera: { x: cameraX, y: cameraY, width: viewWidth, height: viewHeight },
    } = frame;
    const { players, serverTime } = drawn;
    const catSpeech = this.speech.draw(ctx, players, critters, visibleScenery, now, serverTime);
    const debugHitboxes = String(
      preferences.debugHitboxes
        ? drawHitboxes(ctx, view, false, {
            x: cameraX,
            y: cameraY,
            width: viewWidth,
            height: viewHeight,
          })
        : 0,
    );
    return { catSpeech, debugHitboxes };
  }
}
