import { VillageSpeech } from './village-speech';
import { prepareVillageFrame } from './village-frame';
import { drawVillageLighting } from './village-lighting';
import { drawEnvironment } from './environment-rendering';
import { VillagePlayers } from './village-players';
import { villageLayers } from './village-layers';
import { drawVillageLayer } from './village-layer-rendering';
import { FrameBudget } from './frame-budget';
import { createArenaInput } from './arena-input';
import { abilityEffectOpacity } from './ability-effects';
import { LootHints } from './loot-hints';
import { drawLootHints } from './loot-hint-rendering';
import { partyInteraction } from './interaction-targets';

import { useChat } from './ChatProvider';
import { resourceNodes, resourceState, nearbyResource, activityIndicator } from '@emberfall/core';
import { resourceScenery } from './gathering';
import { drawTimedActivity } from './timed-activity';

import { sceneryInteraction, pickInteraction, interactionInRange } from './interaction-targets';
import type { InteractionTarget } from './interaction-targets';

import { alignLocalPickups } from './pickup-presentation';
import { combatCursor } from './cursors';
import { drawHitboxes } from './hitboxes';
import { PixiContext } from './rendering/pixi-context';
import { PresentationWorld } from './presentation/world';
import { villageImages, drawVillageBackground } from './village-background';
import { characterImages } from './characters';

import { actorArt } from './art';

import { companionCaster } from './companion';
import { critterCaster } from './critters';

import { drawNavigation } from './navigation';
import { DamageMeter } from './DamageMeter';
import { PerformanceGraph } from './PerformanceGraph';

import { LocalMovement } from './local-movement';
import { gameAudio } from './audio';
import { createCritterMotion } from './critter-motion';
import { useEffect, useRef } from 'react';
import { useTheme } from '@mui/material';
import type { RefObject } from 'react';
import { SnapshotBuffer } from './snapshots';
import { drawInteractionPrompt } from './effects';
import type { Interaction } from './effects';
import { wrappedDelta } from '@emberfall/common';
import { ARENA, FOREST, nearbyInteraction, inTrainingZone } from '@emberfall/core';
import type { ClientMessage, WorldState, Player } from '@emberfall/common';
import type { GraphicsSettings } from './graphics';
import { castShadow } from './lighting';
import { dayNight } from './day-night';

import { forestRenderer, portalInteraction, drawPlayerAttack } from './forest';
import { drawClassProjectiles, drawLootAndBlood } from './combat-effects';
import type { Preferences } from './preferences';

export function Arena({
  world,
  playerId,
  send,
  graphics,
  preferences,
  latency,
  interaction,
  onCursorAim,
  onInteract,
  onHitpoints,
  onCatSpeech,
}: {
  world: WorldState | null;
  playerId: string;
  send: (message: ClientMessage) => void;
  graphics: GraphicsSettings;
  preferences: Preferences;
  latency: number | null;
  interaction: RefObject<Interaction | null>;
  onCursorAim: (reader: (() => { aimX: number; aimY: number }) | null) => void;
  onInteract: (source: Interaction) => void;
  onHitpoints: (hp: Record<string, number>) => void;
  onCatSpeech: (text: string) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { reportError } = useChat();
  const lootHints = useRef(new LootHints());
  const latest = useRef(world);
  const receivedAt = useRef(0);
  const sender = useRef(send);
  const activate = useRef(onInteract);
  const catSpoke = useRef(onCatSpeech);
  const quality = useRef(graphics);
  const prefs = useRef(preferences);
  const selectedFont = useTheme().typography.fontFamily ?? 'sans-serif';
  const fontFamily = useRef(selectedFont);
  const frameRate = useRef<number | null>(null);
  const networkTiming = useRef<{ inputDelay: number | null; snapshotAge: number | null }>({
    inputDelay: null,
    snapshotAge: null,
  });
  useEffect(() => {
    lootHints.current = new LootHints();
  }, [playerId]);
  useEffect(() => {
    if (latest.current !== world) receivedAt.current = performance.now();
    const confirmedPlayer = world?.players.find((player) => player.id === playerId);
    lootHints.current.observe(
      confirmedPlayer ? (confirmedPlayer.backpack ?? []) : undefined,
      preferences.lootHints,
      performance.now(),
    );
    latest.current = world;
    sender.current = send;
    activate.current = onInteract;
    catSpoke.current = onCatSpeech;
    quality.current = graphics;
    prefs.current = preferences;
    fontFamily.current = selectedFont;
  }, [world, playerId, send, graphics, preferences, onInteract, onCatSpeech, selectedFont]);
  useEffect(() => {
    const element = canvas.current!;
    const renderer = new PixiContext(element);
    let disposed = false;
    void renderer.ready.catch(() => {
      if (!disposed)
        reportError(
          'The game renderer could not start. Enable browser hardware acceleration and reload.',
        );
    });
    const presentation = new PresentationWorld();
    const ctx = renderer;
    const knight = characterImages.warrior.walk;
    const { nature } = villageImages;
    const skeleton = actorArt('skeleton');
    const drawForest = forestRenderer(nature, knight, skeleton);
    const audio = gameAudio(() => prefs.current);
    let lastSlashAt = -Infinity,
      lastHit = 0,
      lastWarning = 0;
    const villageCritters = createCritterMotion();
    const snapshots = new SnapshotBuffer(playerId);
    const localMovement = new LocalMovement(playerId, (message) => sender.current(message));
    let previousHp = '';
    const input = createArenaInput({
      element,
      world: () => latest.current,
      player: () => latest.current?.players.find((p) => p.id === playerId),
      preferences: () => prefs.current,
      send: (message) => sender.current(message),
      activate: (source) => activate.current(source),
      move: (x, y, now) => localMovement.input(x, y, now),
    });
    onCursorAim(input.currentAim);
    let hovered: InteractionTarget | null = null;
    const villageSpeech = new VillageSpeech((text) => catSpoke.current(text));
    const villagePlayers = new VillagePlayers();
    let frame = 0;
    let gatheringClock: { activity: NonNullable<Player['gathering']>; offset: number } | undefined;
    let wardrobeOpenedAt = 0;
    let wardrobeActive = false;
    const resize = () => {
      const ratio = Math.min(devicePixelRatio * quality.current.resolution * budget.scale, 3);
      renderer.resize(Math.round(innerWidth * ratio), Math.round(innerHeight * ratio));
    };
    const budget = new FrameBudget(quality.current, performance.now(), resize);
    resize();
    window.addEventListener('resize', resize);
    let previousScene: string | undefined;
    function draw(now: number) {
      const openWardrobe = interaction.current?.id === 'wardrobe';
      if (openWardrobe && !wardrobeActive) wardrobeOpenedAt = now;
      wardrobeActive = openWardrobe;
      if (!renderer.initialized) {
        frame = requestAnimationFrame(draw);
        return;
      }
      const delta = budget.begin(now, quality.current);
      if (delta === undefined) {
        frame = requestAnimationFrame(draw);
        return;
      }
      element.dataset.lootHintCount = '0';
      renderer.begin();
      renderer.fontFamily = fontFamily.current;
      ctx.imageSmoothingEnabled = quality.current.smoothTextures;
      // Sprite filtering is independent; CSS resampling must preserve smooth text.
      const imageRendering = 'auto';
      if (element.style.imageRendering !== imageRendering)
        element.style.imageRendering = imageRendering;
      const el = element;
      // Keep the original view scale independent of the walkable map size.
      const scale = Math.max(el.width / 960, el.height / 640);
      if (latest.current) snapshots.push(latest.current, now);
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) input.clearKeys();
      const view = latest.current ? snapshots.render(now) : null;
      const cycle = dayNight(view?.serverNow ?? 0);
      renderer.ambientTint = cycle.tint;
      renderer.directionalShadow = cycle.shadow;
      element.dataset.daylight = cycle.daylight.toFixed(3);
      element.dataset.celestial = cycle.celestial;
      element.dataset.shadowDirection = `${cycle.shadow.x.toFixed(3)},${cycle.shadow.y.toFixed(3)}`;
      element.dataset.partyRequests = view?.partyRequests?.map((r) => r.fromId).join(',') ?? '';
      const local = latest.current ? localMovement.render(latest.current, now) : undefined;
      let localSwing = false;
      if (view && local) {
        const width = el.width / scale,
          height = el.height / scale;
        input.camera = {
          x: local.x - width / 2,
          y: local.y - height / 2,
          width,
          height,
        };
        input.combat = {
          type: 'combatInput',
          autoAttack: prefs.current.autoAttack,
          autoTarget: prefs.current.autoTarget,
          autoLoot: prefs.current.autoLoot,
          attacking: input.held && !input.blocked(),
          ...input.currentAim(),
        };
        Object.assign(local, input.combat);
        localSwing = localMovement.animateAttack(local, view, now);
        localMovement.animateProjectiles(local, view, now, localSwing);
        alignLocalPickups(view, local);
      }
      presentation.update(view, playerId, local);
      const cursor = combatCursor(
        view,
        local,
        input.pointer
          ? {
              x: input.camera.x + input.pointer.x * input.camera.width,
              y: input.camera.y + input.pointer.y * input.camera.height,
            }
          : undefined,
        input.held,
        input.blocked(),
        prefs.current.autoTarget,
      );
      if (element.dataset.cursor !== cursor) element.dataset.cursor = cursor;
      networkTiming.current = {
        inputDelay: localMovement.inputDelay(now),
        snapshotAge: snapshots.age(now),
      };
      audio.update(
        local?.scene === 'forest' && view?.scene?.phase === 'active'
          ? 'combat'
          : view
            ? 'lobby'
            : 'start',
        now,
      );
      const warning = view?.scene?.spawns?.at(-1)?.id ?? 0;
      if (warning && warning !== lastWarning) {
        lastWarning = warning;
        audio.play('warning');
      }
      const hp = Object.fromEntries((view?.players ?? []).map((p) => [p.id, p.hitpoints]));
      const hpKey = JSON.stringify(hp);
      if (hpKey !== previousHp) {
        previousHp = hpKey;
        onHitpoints(hp);
      }
      const authoritative = latest.current;
      const authoritativePlayer = authoritative?.players.find((p) => p.id === playerId);
      const drawPrompt = () => {
        const activity = authoritativePlayer?.gathering;
        if (!activity) gatheringClock = undefined;
        element.dataset.gathering = activity?.nodeId ?? '';
        element.dataset.gatheringCheck = activity?.checkId ?? '';
        if (activity && local) {
          element.dataset.interactionPrompt = '';
          const node = resourceNodes(local, 250).find((node) => node.id === activity.nodeId);
          if (node) {
            if (
              !gatheringClock ||
              gatheringClock.activity.startedAt !== activity.startedAt ||
              gatheringClock.activity.nodeId !== activity.nodeId ||
              gatheringClock.activity.epoch !== activity.epoch
            ) {
              // Packet arrival jitter must not restart the fill or indicator clock.
              gatheringClock = {
                activity,
                offset: (authoritative?.serverNow ?? 0) - Math.min(now, receivedAt.current),
              };
            }
            const activityTime = now + gatheringClock.offset;
            element.dataset.gatheringIndicator = String(activityIndicator(activity, activityTime));
            element.dataset.gatheringZone = String(activity.zoneStart);
            drawTimedActivity(ctx, activity, node.x, node.y - node.size - 26, activityTime);
            interaction.current = {
              id: `gather:${node.id}`,
              name: `Gather ${node.kind}`,
              x: node.x,
              y: node.y,
              activate: () => {
                if (input.blocked()) return;
                sender.current({
                  type: 'gather',
                  nodeId: node.id,
                  epoch: activity.epoch,
                  checkId: activity.checkId,
                  at: activityTime,
                });
              },
            };
          }
          return;
        }
        const hideGatheringHint =
          prefs.current.hideGatheringHintInCombat &&
          interaction.current?.id.startsWith('gather:') &&
          (authoritativePlayer?.scene === 'forest'
            ? authoritative?.scene?.phase === 'active'
            : authoritativePlayer &&
              authoritative?.training?.phase === 'active' &&
              inTrainingZone(authoritativePlayer));
        const label =
          local &&
          authoritativePlayer &&
          authoritativePlayer.hitpoints > 0 &&
          !input.blocked() &&
          !hideGatheringHint
            ? (interaction.current?.name ?? '')
            : '';
        if (element.dataset.interactionPrompt !== label) element.dataset.interactionPrompt = label;
        if (local && label) drawInteractionPrompt(ctx, local.x, local.y, label);
      };
      let nearby = authoritativePlayer
        ? nearbyInteraction(
            authoritativePlayer,
            authoritative?.scene?.phase === 'ended',
            authoritative?.scene?.portals,
            authoritative?.npcs,
          )
        : null;
      nearby = partyInteraction(authoritative, authoritativePlayer) ?? nearby;
      if (!nearby && authoritativePlayer) {
        const node = nearbyResource(
          authoritativePlayer,
          authoritative?.resources,
          authoritative?.serverNow ?? 0,
        );
        if (node)
          nearby = { id: `gather:${node.id}`, name: `Gather ${node.kind}`, x: node.x, y: node.y };
      }
      const updateGatherDiagnostics = () => {
        element.dataset.resource = interaction.current?.id.startsWith('gather:')
          ? interaction.current.id.slice(7)
          : '';
        element.dataset.depletedResources = String(
          Object.values(view?.resources ?? {}).filter((state) => state.remaining === 0).length,
        );
        element.dataset.resourceHealth = String(
          view?.resources?.[element.dataset.resource]?.remaining ?? '',
        );
      };
      const highlightInteractions = now - input.altHeldAt > 500 && !input.blocked();
      const outlinedTargets = () => {
        const highlighted = highlightInteractions;
        for (const target of input.targets) target.highlighted = highlighted;
        return highlighted ? input.targets : hovered ? [hovered] : [];
      };
      input.targets = [];
      if (local?.scene === 'forest' && view?.scene?.phase === 'ended') {
        input.targets = view.scene.portals.map((portal) =>
          portalInteraction(
            { id: 'return', name: 'Return to village', ...portal },
            local.x + wrappedDelta(portal.x, local.x, FOREST.width),
            local.y + wrappedDelta(portal.y, local.y, FOREST.height),
          ),
        );
      }
      if (local?.scene === 'forest') {
        input.targets.push(
          ...resourceNodes(local, Math.hypot(input.camera.width, input.camera.height) / 2 + 150)
            .filter(
              (node) => resourceState(view?.resources, node, view?.serverNow ?? 0)?.remaining !== 0,
            )
            .map((node) => sceneryInteraction(resourceScenery(node)))
            .filter((target) => target !== null),
        );
        input.targets.sort((a, b) => a.y + a.height - b.y - b.height);
      }
      hovered = pickInteraction(input.targets, input.pointerPoint());
      interaction.current = hovered
        ? interactionInRange(hovered, authoritativePlayer)
          ? hovered.source
          : hovered.source.id.startsWith('gather:')
            ? nearby
            : null
        : nearby;
      if (
        nearby &&
        !nearby.id.startsWith('gather:') &&
        interaction.current?.id.startsWith('gather:')
      )
        interaction.current = nearby;
      updateGatherDiagnostics();
      element.dataset.interactionTarget = hovered?.source.id ?? '';
      element.dataset.interactionRange = hovered
        ? String(interactionInRange(hovered, authoritativePlayer))
        : '';
      if (local?.scene !== previousScene) {
        villagePlayers.clear();
        previousScene = local?.scene;
      }
      const fps = budget.sample(now);
      if (fps !== undefined) frameRate.current = fps;
      if (localSwing && now - lastSlashAt >= 500) {
        lastSlashAt = now;
        audio.play('slash');
      }
      const hit = view?.scene?.damage.at(-1);
      if (local?.scene === 'forest' && hit && hit.id !== lastHit) {
        lastHit = hit.id;
        audio.play('hit');
      }
      if (!view || local?.scene === 'forest') {
        element.dataset.catSpeech = '';
        drawForest(
          ctx,
          view,
          playerId,
          quality.current,
          prefs.current,
          now,
          delta,
          outlinedTargets(),
          highlightInteractions,
        );
        drawPrompt();
        if (local && prefs.current.lootHints)
          drawLootHints(ctx, lootHints.current.hints, local, now);
        renderer.present();
        frame = requestAnimationFrame(draw);
        return;
      }
      const villageFrame = prepareVillageFrame(view, local, now, quality.current, {
        width: el.width,
        height: el.height,
        scale,
      });
      const {
        background,
        visibleScenery,
        project,
        portal,
        portalTarget,
        camera: { x: cameraX, y: cameraY, width: viewWidth, height: viewHeight },
      } = villageFrame;
      Object.assign(element.dataset, villageFrame.diagnostics);
      const critters = villageCritters(
        now,
        { x: cameraX, y: cameraY, width: viewWidth, height: viewHeight },
        view.players.filter((player) => !player.scene && player.hitpoints > 0),
        view.serverNow ?? now,
      );
      const cats = villageSpeech.targets(critters);
      input.targets = [
        ...visibleScenery.map(sceneryInteraction).filter((target) => target !== null),
        ...cats,
        portalTarget,
      ].sort((a, b) => a.y + a.height - b.y - b.height);
      hovered = pickInteraction(input.targets, input.pointerPoint());
      interaction.current = hovered
        ? interactionInRange(hovered, authoritativePlayer)
          ? hovered.source
          : hovered.source.id.startsWith('gather:')
            ? nearby
            : null
        : (nearby ??
          cats.find((cat) => interactionInRange(cat, authoritativePlayer))?.source ??
          null);
      if (
        nearby &&
        !nearby.id.startsWith('gather:') &&
        interaction.current?.id.startsWith('gather:')
      )
        interaction.current = nearby;
      updateGatherDiagnostics();
      element.dataset.interactionTarget = hovered?.source.id ?? '';
      element.dataset.interactionRange = hovered
        ? String(interactionInRange(hovered, authoritativePlayer))
        : '';

      ctx.setTransform(scale, 0, 0, scale, -cameraX * scale, -cameraY * scale);
      if (background)
        drawVillageBackground(ctx, background, cameraX, cameraY, viewWidth, viewHeight);
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
          quality.current.particles,
          prefs.current,
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
          quality.current.bloom,
          !!training && inTrainingZone(player),
          abilityEffectOpacity(prefs.current, playerId, player.id),
        );
      if (training)
        drawLootAndBlood(ctx, training, serverTime, project, {
          x: cameraX,
          y: cameraY,
          width: viewWidth,
          height: viewHeight,
        });
      // Use the reconciled positions consistently for bodies, lanterns and shadows.
      if (quality.current.shadows) for (const object of visibleScenery) castShadow(ctx, object);
      const dynamic = villagePlayers.prepare(ctx, players, playerId, now, serverTime);
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
      if (quality.current.shadows) for (const caster of dynamic) castShadow(ctx, caster);
      const layers = villageLayers(visibleScenery, players, critters, training, portal);
      const outlines = outlinedTargets();
      const damageByTarget = new Map(training?.damage.map((hit) => [hit.target, hit]));
      const layerFrame = {
        view,
        local,
        playerId,
        now,
        serverTime,
        quality: quality.current,
        preferences: prefs.current,
        highlightInteractions,
        portal,
        portalTarget,
        outlines,
        damageByTarget,
        wardrobeOpen: interaction.current?.id === 'wardrobe',
        wardrobeOpenedAt,
      };
      for (const layer of layers) {
        renderer.occlusion = !!local && layer.y > local.y + 15;
        if (!layer.player) {
          drawVillageLayer(ctx, layer, layerFrame);
          continue;
        }
        villagePlayers.draw(ctx, layer.player!, layerFrame);
      }
      renderer.occlusion = false;
      if (training) {
        if (prefs.current.damageNumbers)
          drawDamageNumbers(
            ctx,
            training.damage,
            project,
            serverTime,
            prefs.current.hideOtherPlayerDamageNumbers ? playerId : undefined,
          );
      }
      drawVillageLighting(ctx, villageFrame, dynamic, players, villagePlayers, cycle);
      drawEnvironment(ctx, villageFrame.camera, now, quality.current, cycle.daylight);
      drawNavigation(ctx, view, playerId);
      drawPrompt();
      element.dataset.catSpeech = villageSpeech.draw(
        ctx,
        players,
        critters,
        visibleScenery,
        now,
        serverTime,
      );
      element.dataset.debugHitboxes = String(
        prefs.current.debugHitboxes
          ? drawHitboxes(ctx, view, false, {
              x: cameraX,
              y: cameraY,
              width: viewWidth,
              height: viewHeight,
            })
          : 0,
      );
      if (local && prefs.current.lootHints) drawLootHints(ctx, lootHints.current.hints, local, now);
      renderer.present();
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      input.dispose();
      window.removeEventListener('resize', resize);
      onCursorAim(null);

      renderer.destroy();
      presentation.clear();
      audio.dispose();
    };
  }, [playerId, interaction, onCursorAim, onHitpoints, reportError]);
  return (
    <>
      <canvas
        ref={canvas}
        width={ARENA.width}
        height={ARENA.height}
        aria-label={
          world
            ? world.players.find((p) => p.id === playerId)?.scene === 'forest'
              ? 'Forest combat scene.'
              : 'Shared village. Move with WASD or arrow keys.'
            : 'Forest preview'
        }
      />
      <PerformanceGraph
        frameRate={frameRate}
        latency={latency}
        networkTiming={networkTiming}
        showFps={preferences.fps}
        showLatency={preferences.latency}
      />
      {world && preferences.dps && <DamageMeter players={world.players} playerId={playerId} />}
    </>
  );
}
import { drawDamageNumbers } from './damage-text';
