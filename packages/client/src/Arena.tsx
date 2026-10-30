import { InteractionPresentation } from './interaction-presentation';
import { VillageScene } from './village-scene';

import { FrameBudget } from './frame-budget';
import { createArenaInput } from './arena-input';

import { LootHints } from './loot-hints';
import { drawLootHints } from './loot-hint-rendering';

import { useChat } from './ChatProvider';
import { resourceNodes, resourceState } from '@emberfall/core';
import { resourceScenery } from './gathering';

import { sceneryInteraction } from './interaction-targets';

import { alignLocalPickups } from './pickup-presentation';
import { combatCursor } from './cursors';

import { PixiContext } from './rendering/pixi-context';
import { PresentationWorld } from './presentation/world';
import { villageImages } from './village-background';
import { characterImages } from './characters';

import { actorArt } from './art';

import { DamageMeter } from './DamageMeter';
import { PerformanceGraph } from './PerformanceGraph';

import { LocalMovement } from './local-movement';
import { gameAudio } from './audio';

import { useEffect, useRef } from 'react';
import { useTheme } from '@mui/material';
import type { RefObject } from 'react';
import { SnapshotBuffer } from './snapshots';

import type { Interaction } from './effects';
import { wrappedDelta } from '@emberfall/common';
import { ARENA, FOREST } from '@emberfall/core';
import type { ClientMessage, WorldState } from '@emberfall/common';
import type { GraphicsSettings } from './graphics';

import { dayNight } from './day-night';

import { forestRenderer, portalInteraction } from './forest';

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
    const village = new VillageScene(playerId, (text) => catSpoke.current(text));
    let frame = 0;
    const prompts = new InteractionPresentation({
      element,
      signal: interaction,
      playerId,
      send: (message) => sender.current(message),
      blocked: input.blocked,
    });
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
      const highlightInteractions = now - input.altHeldAt > 500 && !input.blocked();
      const interactionFrame = prompts.frame({
        ctx,
        authoritative: latest.current,
        view,
        local,
        now,
        receivedAt: receivedAt.current,
        hideGatheringHintInCombat: prefs.current.hideGatheringHintInCombat,
        highlightInteractions,
      });
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
      interactionFrame.select(input.targets, input.pointerPoint());
      if (local?.scene !== previousScene) {
        village.clear();
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
          interactionFrame.outlines(),
          highlightInteractions,
        );
        interactionFrame.draw();
        if (local && prefs.current.lootHints)
          drawLootHints(ctx, lootHints.current.hints, local, now);
        renderer.present();
        frame = requestAnimationFrame(draw);
        return;
      }
      const villageFrame = village.prepare(view, local, now, quality.current, {
        width: el.width,
        height: el.height,
        scale,
      });
      const { visibleScenery, portalTarget, cats } = villageFrame;
      Object.assign(element.dataset, villageFrame.diagnostics);
      input.targets = [
        ...visibleScenery.map(sceneryInteraction).filter((target) => target !== null),
        ...cats,
        portalTarget,
      ].sort((a, b) => a.y + a.height - b.y - b.height);
      interactionFrame.select(input.targets, input.pointerPoint(), cats);
      const drawn = village.draw(ctx, villageFrame, {
        preferences: prefs.current,
        cycle,
        highlightInteractions,
        outlines: interactionFrame.outlines,
        wardrobeOpen: interaction.current?.id === 'wardrobe',
        wardrobeOpenedAt,
      });
      interactionFrame.draw();
      Object.assign(element.dataset, village.overlays(ctx, villageFrame, drawn, prefs.current));
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
