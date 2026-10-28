import { useChat } from './ChatProvider';
import { resourceNodes, resourceState, nearbyResource } from '@emberfall/core';
import { resourceScenery, drawResourceHealth } from './gathering';
import {
  sceneryInteraction,
  pickInteraction,
  interactionInRange,
  drawInteractionOutline,
} from './interaction-targets';
import type { InteractionTarget } from './interaction-targets';
import { npcScenery } from './npc-art';
import { drawNpcWork } from './npc-work';
import { alignLocalPickups } from './pickup-presentation';
import { combatCursor } from './cursors';
import { drawHitboxes } from './hitboxes';
import { PixiContext } from './rendering/pixi-context';
import { PresentationWorld } from './presentation/world';
import { villageImages, villageBackground, drawVillageBackground } from './village-background';
import { characterImages } from './characters';
import { ACTOR_CELL, playerFrame, idleBreath } from './animation';
import { actorArt, environmentArt, wardrobeArt, drawArt } from './art';
import { drawChimneySmoke } from './ambient-art';
import { companionCaster, drawCompanion } from './companion';
import { critterCaster, drawCritter } from './critters';
import { CatSpeech } from './cat-speech';
import { drawNavigation } from './navigation';
import { useDraggable } from '@emberfall/ui';
import { PerformanceGraph } from './PerformanceGraph';
import { movementFacing } from './facing';
import { LocalMovement } from './local-movement';
import { gameAudio } from './audio';
import { createCritterMotion } from './critter-motion';
import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { SnapshotBuffer } from './snapshots';
import {
  drawPlayerHealth,
  drawTargetHit,
  drawChatBubble,
  drawParticles,
  drawVignette,
  drawNameBadge,
  drawCharacterName,
  drawAtmosphere,
  drawVegetation,
} from './effects';
import type { Interaction } from './effects';
import { wrap, wrappedDelta } from '@emberfall/common';
import {
  ARENA,
  FOREST,
  LOBBY_PORTAL,
  INTERACTION_RADIUS,
  nearbyInteraction,
  inTrainingZone,
} from '@emberfall/core';
import { TICK_MS } from '@emberfall/core';
import type { ClientMessage, WorldState } from '@emberfall/common';
import type { GraphicsSettings } from './graphics';
import { castShadow, spriteMask } from './lighting';
import type { Caster, Light } from './lighting';
import { TORCH_LIGHTS, lightTexture, drawTorchFire } from './village';
import {
  forestRenderer,
  drawFog,
  drawPortal,
  portalInteraction,
  drawPlayerDetails,
} from './forest';
import { drawClassProjectiles, drawDebuffs, drawLootAndBlood } from './combat-effects';
import type { Preferences } from './preferences';

const colors = [
  '#efd086',
  '#86d9b6',
  '#99b9ef',
  '#ef99b3',
  '#c8a4ed',
  '#edaa79',
  '#a4cf7b',
  '#ddd',
];
const NPC_SILENCE = { debuffs: [{ kind: 'silence' as const }] };

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
  const {
    ref: dpsRef,
    style: dpsStyle,
    handleProps: dpsHandle,
  } = useDraggable('panel.dps', !!world);
  const canvas = useRef<HTMLCanvasElement>(null);
  const { reportError } = useChat();
  const latest = useRef(world);
  const sender = useRef(send);
  const activate = useRef(onInteract);
  const catSpoke = useRef(onCatSpeech);
  const quality = useRef(graphics);
  const prefs = useRef(preferences);
  const frameRate = useRef<number | null>(null);
  const networkTiming = useRef<{ inputDelay: number | null; snapshotAge: number | null }>({
    inputDelay: null,
    snapshotAge: null,
  });
  useEffect(() => {
    latest.current = world;
    sender.current = send;
    activate.current = onInteract;
    catSpoke.current = onCatSpeech;
    quality.current = graphics;
    prefs.current = preferences;
  }, [world, send, graphics, preferences, onInteract, onCatSpeech]);
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
    const ctx = renderer as unknown as CanvasRenderingContext2D;
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
    const keys = new Set<string>();
    let pointer: { x: number; y: number } | undefined;
    let held = false;
    let pointerInside = false;
    let targets: InteractionTarget[] = [];
    let hovered: InteractionTarget | null = null;
    const catSpeech = new CatSpeech();
    const pointerPoint = () =>
      pointerInside && pointer && !blocked()
        ? {
            x: inputCamera.x + pointer.x * inputCamera.width,
            y: inputCamera.y + pointer.y * inputCamera.height,
          }
        : undefined;
    const confirmedPlayer = () => latest.current?.players.find((p) => p.id === playerId);
    let combat: Extract<ClientMessage, { type: 'combatInput' }> | undefined;
    let inputCamera: { x: number; y: number; width: number; height: number } = {
      x: 0,
      y: 0,
      width: ARENA.width,
      height: ARENA.height,
    };
    const blocked = () =>
      !!document.querySelector('[role="dialog"][aria-modal="true"]') ||
      document.hidden ||
      document.activeElement instanceof HTMLInputElement ||
      document.activeElement instanceof HTMLTextAreaElement;
    const currentAim = () => ({
      aimX: wrap(inputCamera.x + (pointer?.x ?? 0.5) * inputCamera.width, FOREST.width),
      aimY: wrap(inputCamera.y + (pointer?.y ?? 0.5) * inputCamera.height, FOREST.height),
    });
    onCursorAim(currentAim);
    const pointerMove = (event: PointerEvent) => {
      pointerInside = true;
      const rect = element.getBoundingClientRect();
      pointer = {
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height,
      };
    };
    const pointerLeave = () => {
      pointerInside = false;
      element.dataset.cursor = 'default';
    };
    const pointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || blocked()) return;
      pointerMove(event);
      const target = pickInteraction(targets, pointerPoint());
      if (target) {
        held = false;
        if (interactionInRange(target, confirmedPlayer())) activate.current(target.source);
        return;
      }
      held = true;
      sendMovement();
    };
    const pointerUp = (event: PointerEvent) => {
      if (event.button !== 0) return;
      held = false;
      sendMovement();
    };
    element.addEventListener('pointermove', pointerMove);
    element.addEventListener('pointerenter', pointerMove);
    element.addEventListener('pointerleave', pointerLeave);
    element.addEventListener('pointerdown', pointerDown);
    window.addEventListener('pointerup', pointerUp);
    window.addEventListener('pointercancel', pointerUp);
    const positions = new Map<string, { x: number; y: number; facing: number }>();
    const key = (event: KeyboardEvent, down: boolean) => {
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
        return;
      const value = event.code;
      if (
        ![
          'KeyW',
          'KeyA',
          'KeyS',
          'KeyD',
          'ArrowUp',
          'ArrowLeft',
          'ArrowDown',
          'ArrowRight',
        ].includes(value)
      )
        return;
      if (latest.current) event.preventDefault();
      const changed = keys.has(value) !== down;
      if (down) keys.add(value);
      else keys.delete(value);
      if (changed) sendMovement();
    };
    const down = (event: KeyboardEvent) => key(event, true);
    const up = (event: KeyboardEvent) => key(event, false);
    const reset = () => {
      keys.clear();
      held = false;
      pointerInside = false;
      element.dataset.cursor = 'default';
      sendMovement();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', reset);
    const movement = () => ({
      x:
        Number(keys.has('KeyD') || keys.has('ArrowRight')) -
        Number(keys.has('KeyA') || keys.has('ArrowLeft')),
      y:
        Number(keys.has('KeyS') || keys.has('ArrowDown')) -
        Number(keys.has('KeyW') || keys.has('ArrowUp')),
    });
    function sendMovement() {
      const current = latest.current;
      if (!current) return;
      if (blocked()) {
        keys.clear();
        held = false;
      }
      if (combat)
        sender.current({
          ...combat,
          autoAttack: prefs.current.autoAttack,
          autoTarget: prefs.current.autoTarget,
          autoLoot: prefs.current.autoLoot,
          attacking: held && !blocked(),
        });
      const { x, y } = movement();
      localMovement.input(x, y, performance.now());
    }
    const input = setInterval(sendMovement, TICK_MS);
    let frame = 0;
    let wardrobeOpenedAt = 0;
    let wardrobeActive = false;
    let previous = performance.now();
    let resolutionScale = 1,
      budgetAt = performance.now(),
      frameTotal = 0,
      frameCount = 0;
    const resize = () => {
      const ratio = Math.min(devicePixelRatio * quality.current.resolution * resolutionScale, 3);
      renderer.resize(Math.round(innerWidth * ratio), Math.round(innerHeight * ratio));
    };
    resize();
    window.addEventListener('resize', resize);
    let previousSettings = quality.current;
    let previousScene: string | undefined;
    let fpsAt = performance.now(),
      fpsFrames = 0;
    function draw(now: number) {
      const openWardrobe = interaction.current?.id === 'wardrobe';
      if (openWardrobe && !wardrobeActive) wardrobeOpenedAt = now;
      wardrobeActive = openWardrobe;
      if (!renderer.initialized) {
        frame = requestAnimationFrame(draw);
        return;
      }
      const limit = quality.current.frameLimit;
      if (limit && now - previous + 0.5 < 1000 / limit) {
        frame = requestAnimationFrame(draw);
        return;
      }
      if (now - previous < 200) {
        frameTotal += now - previous;
        frameCount++;
      }
      if (now - budgetAt > 2000) {
        const target = 1000 / (limit || 60),
          average = frameTotal / Math.max(1, frameCount);
        const next = quality.current.adaptiveResolution
          ? Math.max(
              0.5,
              Math.min(
                1,
                resolutionScale +
                  (average > target * 1.18 ? -0.1 : average < target * 1.04 ? 0.05 : 0),
              ),
            )
          : 1;
        if (Math.abs(next - resolutionScale) > 0.001) {
          resolutionScale = next;
          resize();
        }
        budgetAt = now;
        frameTotal = 0;
        frameCount = 0;
      }
      renderer.begin();
      ctx.imageSmoothingEnabled = quality.current.smoothTextures;
      const imageRendering = quality.current.smoothTextures ? 'auto' : 'pixelated';
      if (element.style.imageRendering !== imageRendering)
        element.style.imageRendering = imageRendering;
      const delta = Math.min(0.1, (now - previous) / 1000);
      previous = now;
      if (previousSettings !== quality.current) {
        previousSettings = quality.current;
        resolutionScale = 1;
        resize();
      }
      const el = element;
      // Keep the original view scale independent of the walkable map size.
      const scale = Math.max(el.width / 960, el.height / 640);
      if (latest.current) snapshots.push(latest.current, now);
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) keys.clear();
      const view = latest.current ? snapshots.render(now) : null;
      const local = latest.current ? localMovement.render(latest.current, now) : undefined;
      let localSwing = false;
      if (view && local) {
        const width = el.width / scale,
          height = el.height / scale;
        inputCamera = {
          x: local.x - width / 2,
          y: local.y - height / 2,
          width,
          height,
        };
        combat = {
          type: 'combatInput',
          autoAttack: prefs.current.autoAttack,
          autoTarget: prefs.current.autoTarget,
          autoLoot: prefs.current.autoLoot,
          attacking: held && !blocked(),
          ...currentAim(),
        };
        Object.assign(local, combat);
        localSwing = localMovement.animateAttack(local, view, now);
        localMovement.animateProjectiles(local, view, now, localSwing);
        alignLocalPickups(view, local);
      }
      presentation.update(view, playerId, local);
      const cursor = combatCursor(
        view,
        local,
        pointerInside && pointer
          ? {
              x: inputCamera.x + pointer.x * inputCamera.width,
              y: inputCamera.y + pointer.y * inputCamera.height,
            }
          : undefined,
        held,
        blocked(),
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
      let nearby = authoritativePlayer
        ? nearbyInteraction(
            authoritativePlayer,
            authoritative?.scene?.phase === 'ended',
            authoritative?.scene?.portals,
            authoritative?.npcs,
          )
        : null;
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
      targets = [];
      if (local?.scene === 'forest' && view?.scene?.phase === 'ended') {
        targets = view.scene.portals.map((portal) =>
          portalInteraction(
            { id: 'return', name: 'Return to village', ...portal },
            local.x + wrappedDelta(portal.x, local.x, FOREST.width),
            local.y + wrappedDelta(portal.y, local.y, FOREST.height),
          ),
        );
      }
      if (local?.scene === 'forest') {
        targets.push(
          ...resourceNodes(local, Math.hypot(inputCamera.width, inputCamera.height) / 2 + 150)
            .filter(
              (node) => resourceState(view?.resources, node, view?.serverNow ?? 0)?.remaining !== 0,
            )
            .map((node) => sceneryInteraction(resourceScenery(node)))
            .filter((target) => target !== null),
        );
        targets.sort((a, b) => a.y + a.height - b.y - b.height);
      }
      hovered = pickInteraction(targets, pointerPoint());
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
        positions.clear();
        previousScene = local?.scene;
      }
      fpsFrames++;
      if (now - fpsAt >= 500) {
        frameRate.current = Math.round((fpsFrames * 1000) / (now - fpsAt));
        fpsFrames = 0;
        fpsAt = now;
      }
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
        drawForest(ctx, view, playerId, quality.current, prefs.current, now, delta, hovered);
        renderer.present();
        frame = requestAnimationFrame(draw);
        return;
      }
      const prepared = villageBackground(quality.current);
      const scenery = [
        ...(prepared?.scenery ?? []).filter((object) => !/^(tree|plant|rock):/.test(object.id)),
        ...resourceNodes(
          { x: local?.x ?? 480, y: local?.y ?? 320 },
          Math.max(el.width, el.height) / scale + 200,
        ).map((node) => {
          const object = prepared?.scenery.find((o) => o.id === node.id);
          const state = resourceState(view.resources, node, view.serverNow ?? now);
          return {
            ...(state?.remaining === 0 || !object ? resourceScenery(node, state) : object),
            kind: node.kind,
            gathered: state?.remaining === 0,
          };
        }),
        ...npcScenery(view.npcs ?? [], view.serverNow ?? now),
      ];
      element.dataset.npcs = String(view.npcs?.length ?? 0);
      element.dataset.workstations = String(
        prepared?.scenery.filter((s) => s.id.startsWith('workstation:')).length ?? 0,
      );
      element.dataset.workingNpcIds = (view.npcs ?? [])
        .filter((n) => n.workstationId)
        .map((n) => n.id)
        .join(',');
      element.dataset.workingNpcs = String(view.npcs?.filter((n) => n.workstationId).length ?? 0);
      element.dataset.silencedNpcs = String(view.npcs?.filter((n) => n.silenced).length ?? 0);
      for (const object of scenery)
        if (object.frames)
          Object.assign(object, object.frames[Math.floor(now / 400) % object.frames.length]);
      const torchTextures = prepared?.torchTextures ?? [];
      const focus = local ?? { x: 480, y: 320 };
      const viewWidth = el.width / scale;
      const viewHeight = el.height / scale;
      const cameraX = focus.x - viewWidth / 2;
      const cameraY = focus.y - viewHeight / 2;
      const project = (x: number, y: number) => ({
        x: focus.x + wrappedDelta(x, focus.x, ARENA.width),
        y: focus.y + wrappedDelta(y, focus.y, ARENA.height),
      });
      const visibleScenery = scenery
        .map((object) => ({ ...object, ...project(object.x, object.y) }))
        .filter(
          (object) =>
            object.x > cameraX - 200 &&
            object.x < cameraX + viewWidth + 200 &&
            object.y > cameraY - 200 &&
            object.y < cameraY + viewHeight + 200,
        );
      const portal = project(LOBBY_PORTAL.x, LOBBY_PORTAL.y);
      const portalTarget = portalInteraction(
        { id: 'portal', name: 'Forest portal', ...LOBBY_PORTAL },
        portal.x,
        portal.y,
      );
      const critters = villageCritters(
        now,
        { x: cameraX, y: cameraY, width: viewWidth, height: viewHeight },
        view.players.filter((player) => !player.scene && player.hitpoints > 0),
        view.serverNow ?? now,
      );
      const cats: InteractionTarget[] = [];
      for (const cat of critters) {
        if (cat.kind !== 'cat') continue;
        const caster = critterCaster(cat);
        if (!caster) continue;
        cats.push({
          source: {
            id: cat.id,
            name: 'Cat',
            x: cat.x,
            y: cat.y,
            activate: () => {
              const text = catSpeech.pet(cat.id, performance.now());
              if (text) catSpoke.current(text);
            },
          },
          x: cat.x - 12,
          y: cat.y - 24,
          width: 24,
          height: 24,
          mask: caster.mask,
          reach: cat,
          radius: INTERACTION_RADIUS,
        });
      }
      targets = [
        ...visibleScenery.map(sceneryInteraction).filter((target) => target !== null),
        ...cats,
        portalTarget,
      ].sort((a, b) => a.y + a.height - b.y - b.height);
      hovered = pickInteraction(targets, pointerPoint());
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
      if (prepared)
        drawVillageBackground(ctx, prepared.background, cameraX, cameraY, viewWidth, viewHeight);
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
        drawLootAndBlood(ctx, training, serverTime, project, {
          x: cameraX,
          y: cameraY,
          width: viewWidth,
          height: viewHeight,
        });
      }
      const players = view.players
        .filter((p) => !p.scene)
        .map((p) => ({
          ...p,
          ...project(p.x, p.y),
          bear: p.bear ? { ...p.bear, ...project(p.bear.x, p.bear.y) } : undefined,
        }));
      const liveIds = new Set(players.map((p) => p.id));
      for (const id of positions.keys()) if (!liveIds.has(id)) positions.delete(id);
      // Use the reconciled positions consistently for bodies, lanterns and shadows.
      const dynamic: Caster[] = [];
      if (quality.current.shadows)
        for (const object of visibleScenery)
          if (object.frames || object.npc || object.id.startsWith('tree:') || object.kind)
            castShadow(ctx, object);
      for (const player of players) {
        const pos = positions.get(player.id) ?? { x: player.x, y: player.y, facing: 0 };
        const ix = player.inputX ?? 0,
          iy = player.inputY ?? 0;
        if (Math.hypot(ix, iy) > 0) pos.facing = movementFacing(ix, iy, pos.facing);
        const frame = playerFrame(
          player.id === playerId ? now : serverTime,
          Math.hypot(ix, iy) > 0,
          player.hitpoints > 0,
          player.attackAt,
        );
        if (frame === 5 || frame === 6)
          pos.facing = movementFacing(
            Math.cos(player.attackAngle ?? 0),
            Math.sin(player.attackAngle ?? 0),
            pos.facing,
          );
        const mask = spriteMask(
          characterImages[player.classId ?? 'warrior'].walk,
          pos.facing,
          frame,
          false,
          ACTOR_CELL,
          false,
          ACTOR_CELL,
        );
        if (mask && player.id === playerId) {
          const breath = idleBreath(now, frame);
          renderer.setPlayerCutout(
            mask,
            player.x - 24,
            player.y + 18 - 48 * breath,
            48,
            48 * breath,
          );
        }
        if (mask)
          dynamic.push({
            id: player.id,
            x: player.x,
            y: player.y + 15,
            width: 48,
            height: 48,
            mask,
          });
      }
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
      const layers = [
        {
          y: portal.y + 8,
          object: null,
          player: null,
          bear: null,
          critter: null,
          portal,
          dummy: null,
        },
        ...visibleScenery.map((object) => ({
          y: object.y,
          object,
          player: null,
          bear: null,
          critter: null,
          portal: null,
          dummy: null,
        })),
        ...players.map((player) => ({
          y: player.y + 15,
          object: null,
          player,
          bear: null,
          critter: null,
          portal: null,
          dummy: null,
        })),
        ...players.flatMap((p) =>
          p.bear
            ? [
                {
                  y: p.bear.y + 18,
                  object: null,
                  player: null,
                  bear: p.bear,
                  critter: null,
                  portal: null,
                  dummy: null,
                },
              ]
            : [],
        ),
        ...critters.map((critter) => ({
          y: critter.y,
          object: null,
          player: null,
          bear: null,
          critter,
          portal: null,
          dummy: null,
        })),
        ...(training?.enemies ?? []).map((dummy) => ({
          y: dummy.y + 15,
          object: null,
          player: null,
          bear: null,
          critter: null,
          portal: null,
          dummy,
        })),
      ].sort((a, b) => a.y - b.y);
      const damageByTarget = new Map(training?.damage.map((hit) => [hit.target, hit]));
      for (const layer of layers) {
        renderer.occlusion = !!local && layer.y > local.y + 15;
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
          renderer.occlusion = false;
          ctx.fillStyle = '#152018';
          ctx.fillRect(dummy.x - 20, dummy.y - 46, 40, 5);
          ctx.fillStyle = '#df7765';
          ctx.fillRect(dummy.x - 19, dummy.y - 45, (38 * dummy.hitpoints) / dummy.maxHitpoints!, 3);
          drawDebuffs(ctx, dummy, dummy.x - 20, dummy.y - 46, serverTime);

          continue;
        }
        if (layer.portal) {
          drawPortal(
            ctx,
            portal.x,
            portal.y,
            now,
            quality.current.bloom,
            'Forest portal',
            hovered === portalTarget ? hovered : null,
            quality.current.shadows,
            quality.current.wavingVegetation,
          );
          continue;
        }
        if (layer.critter) {
          drawCritter(ctx, layer.critter, quality.current.shadows);
          if (hovered?.source.id === layer.critter.id) drawInteractionOutline(ctx, hovered);
          ctx.globalAlpha = 1;
          continue;
        }
        if (layer.bear) {
          drawCompanion(
            ctx,
            layer.bear,
            layer.bear.x,
            layer.bear.y,
            view?.serverNow ?? now,
            quality.current.shadows,
          );
          continue;
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
              quality.current.wavingVegetation,
            );
          else if (object.id === 'building:wardrobe') {
            const open = interaction.current?.id === 'wardrobe';
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
            drawTorchFire(
              ctx,
              object.x,
              object.y,
              now,
              quality.current.particles,
              quality.current.bloom,
            );
          else
            ctx.drawImage(
              object.sprite,
              object.x - object.width / 2,
              object.y - object.height,
              object.width,
              object.height,
            );
          if (object.npc?.workstationId)
            drawNpcWork(ctx, object.npc, object.x, object.y, serverTime, quality.current.particles);
          if (
            hovered &&
            (hovered.source.id === object.id.replace(/^(building|npc|workstation):/, '') ||
              hovered.source.id === `gather:${object.id}`)
          )
            drawInteractionOutline(ctx, hovered);
          if (object.chimney && quality.current.particles)
            drawChimneySmoke(ctx, object.x + object.chimney.x, object.y + object.chimney.y, now);
          ctx.globalAlpha = 1;
          if (object.id.startsWith('tree:'))
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
          continue;
        }
        const player = layer.player!;
        const knight = characterImages[player.classId ?? 'warrior'].walk;
        const pos = positions.get(player.id) ?? { x: player.x, y: player.y, facing: 0 };
        const dx = wrappedDelta(player.x, pos.x, ARENA.width);
        const dy = wrappedDelta(player.y, pos.y, ARENA.height);
        const ix = player.inputX ?? 0,
          iy = player.inputY ?? 0;
        const moving = Math.hypot(ix, iy) > 0;
        const spriteRow = playerFrame(
          player.id === playerId ? now : serverTime,
          moving,
          player.hitpoints > 0,
          player.attackAt,
        );
        // Four directions share the same idle, walk, action and fallen rows.
        if (moving) pos.facing = movementFacing(ix, iy, pos.facing);
        if (spriteRow === 5 || spriteRow === 6)
          pos.facing = movementFacing(
            Math.cos(player.attackAngle ?? 0),
            Math.sin(player.attackAngle ?? 0),
            pos.facing,
          );
        pos.x = player.x;
        pos.y = player.y;
        positions.set(player.id, pos);
        ctx.globalAlpha = 1;
        renderer.spriteTint = player.reconnecting ? '#ff5555' : '#ffffff';
        if (knight.complete && knight.naturalWidth) {
          if (quality.current.motionBlur && moving) {
            // Sprite-only temporal samples keep HUD text and the world sharp.
            for (let sample = 3; sample > 0; sample--) {
              ctx.globalAlpha = 0.09;
              ctx.drawImage(
                knight,
                pos.facing * ACTOR_CELL,
                spriteRow * ACTOR_CELL,
                ACTOR_CELL,
                ACTOR_CELL,
                pos.x - 24 - dx * sample * 0.45,
                pos.y - 30 - dy * sample * 0.45,
                48,
                48,
              );
            }
            ctx.globalAlpha = 1;
          }
          ctx.drawImage(
            knight,
            pos.facing * ACTOR_CELL,
            spriteRow * ACTOR_CELL,
            ACTOR_CELL,
            ACTOR_CELL,
            pos.x - 24,
            pos.y + 18 - 48 * idleBreath(now, spriteRow),
            48,
            48 * idleBreath(now, spriteRow),
          );
        }
        renderer.spriteTint = '#ffffff';
        renderer.occlusion = false;
        ctx.globalAlpha = 1;
        drawPlayerHealth(
          ctx,
          pos.x,
          pos.y - 46,
          player.hitpoints,
          player.maxHitpoints,
          player.name,
          colors[player.color],
        );
        drawPlayerDetails(
          ctx,
          player,
          pos.x,
          pos.y,
          pos.facing,
          player.id === playerId ? now : serverTime,
          quality.current.bloom,
          !!training && inTrainingZone(player),
          false,
        );
      }
      renderer.occlusion = false;
      if (training) {
        drawClassProjectiles(ctx, training, serverTime, project);
        if (prefs.current.damageNumbers)
          drawDamageNumbers(ctx, training.damage, project, serverTime);
      }
      if (quality.current.lighting) {
        ctx.save();
        ctx.fillStyle = '#f3ca7a09';
        ctx.fillRect(cameraX, cameraY, viewWidth, viewHeight);
        ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < TORCH_LIGHTS.length; i++) {
          const source = TORCH_LIGHTS[i];
          const light = { ...source, ...project(source.x, source.y) };
          if (
            light.x + light.radius < cameraX ||
            light.x - light.radius > cameraX + viewWidth ||
            light.y + light.radius < cameraY ||
            light.y - light.radius > cameraY + viewHeight
          )
            continue;
          const texture = torchTextures[i];
          if (!texture) continue;
          const movingLight = lightTexture(
            light,
            [
              ...dynamic,
              ...visibleScenery.filter(
                (object) => object.frames || object.id.startsWith('tree:') || object.kind,
              ),
            ],
            quality.current.shadows,
            texture,
          );
          ctx.globalAlpha = 0.9 + Math.sin(now / 190 + i) * 0.1;
          ctx.drawImage(movingLight, light.x - light.radius, light.y - light.radius);
        }
        ctx.globalAlpha = 1;
        for (const player of players) {
          const pos = positions.get(player.id) ?? { x: player.x, y: player.y, facing: 0 };
          const lantern: Light = {
            x: pos.x + (pos.facing === 2 ? -15 : 12),
            y: pos.y + 15,
            height: 28,
            radius: 110,
            strength: 0.18,
            owner: player.id,
          };
          ctx.drawImage(
            lightTexture(lantern, [...visibleScenery, ...dynamic], quality.current.shadows),
            lantern.x - lantern.radius,
            lantern.y - lantern.radius,
          );
        }
        ctx.restore();
      }
      if (quality.current.particles)
        drawParticles(ctx, cameraX, cameraY, viewWidth, viewHeight, now);
      if (quality.current.fog) drawFog(ctx, cameraX, cameraY, viewWidth, viewHeight, now);
      drawAtmosphere(ctx, cameraX, cameraY, viewWidth, viewHeight, now, quality.current);
      if (quality.current.vignette) drawVignette(ctx, cameraX, cameraY, viewWidth, viewHeight);
      drawNavigation(ctx, view, playerId);
      for (const player of players) drawChatBubble(ctx, player.x, player.y, player.chat);
      const catMessages: string[] = [];
      for (const cat of critters) {
        if (cat.kind !== 'cat') continue;
        const message = catSpeech.message(cat.id, now);
        if (message) {
          drawChatBubble(ctx, cat.x, cat.y + 20, message);
          catMessages.push(message);
        }
      }
      element.dataset.catSpeech = catMessages.join(',');
      for (const object of visibleScenery) {
        // NPC positions are feet anchors; this matches the 40-unit actor health/status row.
        if (object.npc?.silenced)
          drawDebuffs(ctx, NPC_SILENCE, object.x - 20, object.y - 61, serverTime);
        else if (object.npc && (object.npc.chatUntil ?? 0) > serverTime)
          drawChatBubble(ctx, object.x, object.y - 24, object.npc.chat);
      }
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
      renderer.present();
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      clearInterval(input);
      window.removeEventListener('resize', resize);
      onCursorAim(null);
      element.removeEventListener('pointermove', pointerMove);
      element.removeEventListener('pointerenter', pointerMove);
      element.removeEventListener('pointerleave', pointerLeave);
      element.removeEventListener('pointerdown', pointerDown);
      window.removeEventListener('pointerup', pointerUp);
      window.removeEventListener('pointercancel', pointerUp);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', reset);
      document.removeEventListener('visibilitychange', reset);

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
      {world && preferences.dps && (
        <aside
          className='dps-meter'
          ref={dpsRef}
          style={dpsStyle}
          {...dpsHandle}
          aria-label='Damage per second'
          title='Your damage over the last 5 seconds, including ailments and your companion'
        >
          <strong>
            {Math.round(world.players.find((player) => player.id === playerId)?.dps ?? 0)} DPS
          </strong>
          <small>Last 5 seconds</small>
        </aside>
      )}
    </>
  );
}
import { drawDamageNumbers } from './damage-text';
