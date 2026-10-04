import { PixiContext } from "./rendering/pixi-context";
import { PresentationWorld } from "./presentation/world";
import { villageImages, villageBackground, drawVillageBackground } from "./village-background";
import { characterImages } from "./characters";
import { companionCaster, drawCompanion } from "./companion";
import { critterCaster, crittersAt, drawCritter } from "./critters";
import { drawNavigation } from "./navigation";
import { useDraggable } from "@emberfall/ui";
import { PerformanceGraph } from "./PerformanceGraph";
import { movementFacing } from "./facing";
import { LocalMovement } from "./local-movement";
import { gameAudio } from "./audio";
import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { SnapshotBuffer } from "./snapshots";
import {
  drawPlayerHealth,
  drawTargetHit,
  drawChatBubble,
  drawParticles,
  drawVignette,
  drawNameBadge,
  drawAtmosphere,
  obstacleOpacity,
  drawVegetation,
} from "./effects";
import type { Interaction } from "./effects";
import {
  ARENA,
  FOREST,
  wrap,
  wrappedDelta,
  defaultSpellRange,
  LOBBY_PORTAL,
  TICK_MS,
  nearbyInteraction,
  TRAINING_ZONES,
  inTrainingZone,
} from "@emberfall/common-new";
import type { ClientMessage, WorldState } from "@emberfall/common-new";
import type { GraphicsSettings } from "./graphics";
import { castShadow, makeMask, spriteMask } from "./lighting";
import type { Caster, Light } from "./lighting";
import { TORCH_LIGHTS, lightTexture, drawTorchFire } from "./village";
import { forestRenderer, drawFog, drawPortal, drawPlayerDetails } from "./forest";
import { drawClassProjectiles, drawDebuffs, drawLootAndBlood } from "./combat-effects";
import type { Preferences } from "./preferences";

const colors = [
  "#efd086",
  "#86d9b6",
  "#99b9ef",
  "#ef99b3",
  "#c8a4ed",
  "#edaa79",
  "#a4cf7b",
  "#ddd",
];
export function Arena({
  world,
  playerId,
  send,
  graphics,
  preferences,
  latency,
  interaction,
  onHitpoints,
}: {
  world: WorldState | null;
  playerId: string;
  send: (message: ClientMessage) => void;
  graphics: GraphicsSettings;
  preferences: Preferences;
  latency: number | null;
  interaction: RefObject<Interaction | null>;
  onHitpoints: (hp: Record<string, number>) => void;
}) {
  const {
    ref: dpsRef,
    style: dpsStyle,
    handleProps: dpsHandle,
  } = useDraggable("panel.dps", !!world);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [renderError, setRenderError] = useState(false);
  const latest = useRef(world);
  const sender = useRef(send);
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
    quality.current = graphics;
    prefs.current = preferences;
  }, [world, send, graphics, preferences]);
  useEffect(() => {
    const element = canvas.current!;
    const renderer = new PixiContext(element);
    let disposed = false;
    void renderer.ready
      .then(() => {
        if (!disposed) setRenderError(false);
      })
      .catch(() => {
        if (!disposed) setRenderError(true);
      });
    const presentation = new PresentationWorld();
    const ctx = renderer as unknown as CanvasRenderingContext2D;
    const knight = characterImages.warrior.walk;
    const { nature } = villageImages;
    const animatedLantern = new Image();
    animatedLantern.src = "/assets/lanterns/lantern-animation.png";
    const skeleton = new Image();
    skeleton.src = "/assets/skeleton.png";
    const drawForest = forestRenderer(nature, knight, skeleton);
    const audio = gameAudio(() => prefs.current);
    let lastSlashAt = -Infinity,
      lastHit = 0,
      lastWarning = 0;
    const playerMasks = new Map<HTMLImageElement, HTMLCanvasElement[]>();
    const characterMask = (image: HTMLImageElement, frame: number, facing: number) => {
      if (!image.naturalWidth) return undefined;
      let masks = playerMasks.get(image);
      if (!masks) {
        masks = [];
        playerMasks.set(image, masks);
      }
      const index = frame * 4 + facing;
      if (!masks[index]) {
        const tile = document.createElement("canvas");
        tile.width = tile.height = 16;
        tile.getContext("2d")!.drawImage(image, facing * 16, frame * 16, 16, 16, 0, 0, 16, 16);
        masks[index] = makeMask(tile);
      }
      return masks[index];
    };
    const snapshots = new SnapshotBuffer(playerId);
    const localMovement = new LocalMovement(playerId, (message) => sender.current(message));
    let previousHp = "";
    const keys = new Set<string>();
    let pointer: { x: number; y: number } | undefined;
    let held = false;
    let combat: Extract<ClientMessage, { type: "combatInput" }> | undefined;
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
    const pointerMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      pointer = {
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height,
      };
    };
    const pointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || blocked()) return;
      pointerMove(event);
      held = true;
      sendMovement();
    };
    const pointerUp = (event: PointerEvent) => {
      if (event.button !== 0) return;
      held = false;
      sendMovement();
    };
    element.addEventListener("pointermove", pointerMove);
    element.addEventListener("pointerdown", pointerDown);
    window.addEventListener("pointerup", pointerUp);
    window.addEventListener("pointercancel", pointerUp);
    const positions = new Map<string, { x: number; y: number; facing: number }>();
    const key = (event: KeyboardEvent, down: boolean) => {
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
        return;
      const value = event.code;
      if (
        ![
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "ArrowUp",
          "ArrowLeft",
          "ArrowDown",
          "ArrowRight",
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
      sendMovement();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", reset);
    const movement = () => ({
      x:
        Number(keys.has("KeyD") || keys.has("ArrowRight")) -
        Number(keys.has("KeyA") || keys.has("ArrowLeft")),
      y:
        Number(keys.has("KeyS") || keys.has("ArrowDown")) -
        Number(keys.has("KeyW") || keys.has("ArrowUp")),
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
          attacking: held && !blocked(),
        });
      const { x, y } = movement();
      localMovement.input(x, y, performance.now());
    }
    const input = setInterval(sendMovement, TICK_MS);
    function drawCursorRange(player: import("@emberfall/common-new").Player | undefined) {
      if (!player || prefs.current.autoTarget || !pointer || player.hitpoints <= 0) return;
      const scene = player.scene === "forest" ? latest.current?.scene : latest.current?.training;
      if (scene?.phase !== "active" || (!player.scene && !inTrainingZone(player))) return;
      const x = inputCamera.x + pointer.x * inputCamera.width;
      const y = inputCamera.y + pointer.y * inputCamera.height;
      const range = defaultSpellRange({ ...player, autoTarget: false });
      if (Math.hypot(x - player.x, y - player.y) <= range) return;
      const scale = element.width / inputCamera.width;
      ctx.save();
      ctx.setTransform(scale, 0, 0, scale, -inputCamera.x * scale, -inputCamera.y * scale);
      ctx.fillStyle = "rgba(82, 237, 135, 0.08)";
      ctx.strokeStyle = "rgba(82, 237, 135, 0.45)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(player.x, player.y, range, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    let frame = 0;
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
    window.addEventListener("resize", resize);
    let previousSettings = quality.current;
    let previousScene: string | undefined;
    let fpsAt = performance.now(),
      fpsFrames = 0;
    function draw(now: number) {
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
        const aimX = inputCamera.x + (pointer?.x ?? 0.5) * width;
        const aimY = inputCamera.y + (pointer?.y ?? 0.5) * height;
        combat = {
          type: "combatInput",
          autoAttack: prefs.current.autoAttack,
          autoTarget: prefs.current.autoTarget,
          attacking: held && !blocked(),
          aimX: wrap(aimX, FOREST.width),
          aimY: wrap(aimY, FOREST.height),
        };
        Object.assign(local, combat);
        localSwing = localMovement.animateAttack(local, view, now);
        localMovement.animateProjectiles(local, view, now, localSwing);
      }
      presentation.update(view, playerId, local);
      networkTiming.current = {
        inputDelay: localMovement.inputDelay(now),
        snapshotAge: snapshots.age(now),
      };
      audio.update(
        local?.scene === "forest" && view?.scene?.phase === "active"
          ? "combat"
          : view
            ? "lobby"
            : "start",
        now,
      );
      const warning = view?.scene?.spawns?.at(-1)?.id ?? 0;
      if (warning && warning !== lastWarning) {
        lastWarning = warning;
        audio.play("warning");
      }
      const hp = Object.fromEntries((view?.players ?? []).map((p) => [p.id, p.hitpoints]));
      const hpKey = JSON.stringify(hp);
      if (hpKey !== previousHp) {
        previousHp = hpKey;
        onHitpoints(hp);
      }
      const authoritative = latest.current;
      const player = authoritative?.players.find((p) => p.id === playerId);
      interaction.current = player
        ? nearbyInteraction(
            player,
            authoritative?.scene?.phase === "ended",
            authoritative?.scene?.portals,
          )
        : null;
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
        audio.play("slash");
      }
      const hit = view?.scene?.damage.at(-1);
      if (local?.scene === "forest" && hit && hit.id !== lastHit) {
        lastHit = hit.id;
        audio.play("hit");
      }
      if (!view || local?.scene === "forest") {
        drawForest(
          ctx,
          view,
          playerId,
          quality.current,
          prefs.current,
          now,
          delta,
          interaction.current,
        );
        drawCursorRange(local);
        renderer.present();
        frame = requestAnimationFrame(draw);
        return;
      }
      const prepared = villageBackground(quality.current);
      const scenery = prepared?.scenery ?? [];
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
      ctx.setTransform(scale, 0, 0, scale, -cameraX * scale, -cameraY * scale);
      ctx.imageSmoothingEnabled = false;
      if (prepared)
        drawVillageBackground(ctx, prepared.background, cameraX, cameraY, viewWidth, viewHeight);
      else {
        ctx.fillStyle = "#25392f";
        ctx.fillRect(cameraX, cameraY, viewWidth, viewHeight);
      }
      for (const zone of TRAINING_ZONES) {
        ctx.fillStyle = "#aa8b4930";
        ctx.strokeStyle = "#c9a56380";
        ctx.lineWidth = 2;
        ctx.beginPath();
        const point = project(zone.x, zone.y);
        ctx.ellipse(point.x, point.y, zone.radius, zone.radius * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
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
        const damageByTarget = new Map(training.damage.map((hit) => [hit.target, hit]));
        for (const dummy of training.enemies) {
          if (skeleton.naturalWidth) {
            ctx.drawImage(skeleton, 0, 0, 16, 16, dummy.x - 24, dummy.y - 30, 48, 48);
            const hit = damageByTarget.get(`enemy:${dummy.id}`);
            if (hit)
              drawTargetHit(
                ctx,
                spriteMask(skeleton, 0, 0)!,
                dummy.x - 24,
                dummy.y - 30,
                48,
                48,
                serverTime - hit.at,
              );
          }
          ctx.fillStyle = "#152018";
          ctx.fillRect(dummy.x - 20, dummy.y - 46, 40, 5);
          ctx.fillStyle = "#df7765";
          ctx.fillRect(dummy.x - 19, dummy.y - 45, (38 * dummy.hitpoints) / dummy.maxHitpoints!, 3);
          drawDebuffs(ctx, dummy, dummy.x - 20, dummy.y - 46, serverTime);
        }
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
      for (const player of players) {
        const pos = positions.get(player.id) ?? { x: player.x, y: player.y, facing: 0 };
        const ix = player.inputX ?? 0,
          iy = player.inputY ?? 0;
        if (Math.hypot(ix, iy) > 0) pos.facing = movementFacing(ix, iy, pos.facing);
        const frame = Math.hypot(ix, iy) > 0 ? Math.floor(now / 120) % 4 : 0;
        const mask = characterMask(
          characterImages[player.classId ?? "warrior"].walk,
          frame,
          pos.facing,
        );
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
      const critters = crittersAt("village", view.serverNow ?? now, {
        x: cameraX,
        y: cameraY,
        width: viewWidth,
        height: viewHeight,
      });
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
        },
        ...visibleScenery.map((object) => ({
          y: object.y,
          object,
          player: null,
          bear: null,
          critter: null,
          portal: null,
        })),
        ...players.map((player) => ({
          y: player.y + 15,
          object: null,
          player,
          bear: null,
          critter: null,
          portal: null,
        })),
        ...players.flatMap((p) =>
          p.bear
            ? [
                {
                  y: p.bear.y + 15,
                  object: null,
                  player: null,
                  bear: p.bear,
                  critter: null,
                  portal: null,
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
        })),
      ].sort((a, b) => a.y - b.y);
      for (const layer of layers) {
        if (layer.portal) {
          drawPortal(
            ctx,
            portal.x,
            portal.y,
            now,
            quality.current.bloom,
            "Forest portal",
            interaction.current?.id === "portal",
            quality.current.shadows,
            quality.current.wavingVegetation,
          );
          continue;
        }
        if (layer.critter) {
          drawCritter(ctx, layer.critter, quality.current.shadows);
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
          ctx.globalAlpha = obstacleOpacity(object, local);
          const vegetation = object.id.startsWith("tree:") || object.id.startsWith("grass:");
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
          else
            ctx.drawImage(
              object.sprite,
              object.x - object.width / 2,
              object.y - object.height,
              object.width,
              object.height,
            );
          if (object.id.startsWith("torch:"))
            drawTorchFire(
              ctx,
              animatedLantern,
              object.x,
              object.y,
              now,
              quality.current.particles,
              quality.current.bloom,
            );
          ctx.globalAlpha = 1;
          if (object.name)
            drawNameBadge(
              ctx,
              object.x,
              object.y,
              object.name,
              object.id === `building:${interaction.current?.id}`,
            );
          continue;
        }
        const player = layer.player!;
        const knight = characterImages[player.classId ?? "warrior"].walk;
        const pos = positions.get(player.id) ?? { x: player.x, y: player.y, facing: 0 };
        const dx = wrappedDelta(player.x, pos.x, ARENA.width);
        const dy = wrappedDelta(player.y, pos.y, ARENA.height);
        const ix = player.inputX ?? 0,
          iy = player.inputY ?? 0;
        const moving = Math.hypot(ix, iy) > 0;
        // Sheet columns: down, up, left, right. Rows: the four walking frames.
        if (moving) pos.facing = movementFacing(ix, iy, pos.facing);
        pos.x = player.x;
        pos.y = player.y;
        positions.set(player.id, pos);
        ctx.strokeStyle = colors[player.color];
        ctx.lineWidth = player.id === playerId ? 2 : 1;
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y + 15, 18, 8, 0, 0, Math.PI * 2);
        ctx.stroke();
        if (knight.complete && knight.naturalWidth) {
          if (quality.current.motionBlur && moving) {
            // Sprite-only temporal samples keep HUD text and the world sharp.
            for (let sample = 3; sample > 0; sample--) {
              ctx.globalAlpha = 0.09;
              ctx.drawImage(
                knight,
                pos.facing * 16,
                (Math.floor(now / 120) % 4) * 16,
                16,
                16,
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
            pos.facing * 16,
            (moving ? Math.floor(now / 120) % 4 : 0) * 16,
            16,
            16,
            pos.x - 24,
            pos.y - 30,
            48,
            48,
          );
        }
        // Belt lantern: warm glass and a dark metal frame attached to each character.
        const beltX = pos.x + (pos.facing === 2 ? -15 : 12);
        ctx.fillStyle = "#382e21";
        ctx.fillRect(beltX - 3, pos.y + 1, 7, 11);
        ctx.fillStyle = "#e7a74d";
        ctx.fillRect(beltX - 2, pos.y + 3, 5, 7);
        ctx.fillStyle = "#ffe2a0";
        ctx.fillRect(beltX, pos.y + 4, 2, 5);
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
      if (training) {
        drawClassProjectiles(ctx, training, serverTime, project);
        if (prefs.current.damageNumbers)
          drawDamageNumbers(ctx, training.damage, project, serverTime);
      }
      if (quality.current.lighting) {
        ctx.save();
        ctx.fillStyle = "#f3ca7a09";
        ctx.fillRect(cameraX, cameraY, viewWidth, viewHeight);
        ctx.globalCompositeOperation = "screen";
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
          const movingLight = lightTexture(light, dynamic, quality.current.shadows, texture);
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
      drawCursorRange(local);
      drawNavigation(ctx, view, playerId);
      for (const player of players) drawChatBubble(ctx, player.x, player.y, player.chat);
      renderer.present();
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      clearInterval(input);
      window.removeEventListener("resize", resize);
      element.removeEventListener("pointermove", pointerMove);
      element.removeEventListener("pointerdown", pointerDown);
      window.removeEventListener("pointerup", pointerUp);
      window.removeEventListener("pointercancel", pointerUp);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", reset);
      document.removeEventListener("visibilitychange", reset);

      renderer.destroy();
      presentation.clear();
      audio.dispose();
    };
  }, [playerId, interaction, onHitpoints]);
  return (
    <>
      {renderError && (
        <p role="alert">
          The game renderer could not start. Enable browser hardware acceleration and reload.
        </p>
      )}
      <canvas
        ref={canvas}
        width={ARENA.width}
        height={ARENA.height}
        aria-label={
          world
            ? world.players.find((p) => p.id === playerId)?.scene === "forest"
              ? "Forest combat scene."
              : "Shared village. Move with WASD or arrow keys."
            : "Forest preview"
        }
      />
      <PerformanceGraph
        frameRate={frameRate}
        latency={latency}
        networkTiming={networkTiming}
        showFps={preferences.fps}
        showLatency={preferences.latency}
      />
      {world && (
        <aside
          className="dps-meter"
          ref={dpsRef}
          style={dpsStyle}
          {...dpsHandle}
          aria-label="Damage per second"
          title="Your damage over the last 5 seconds, including ailments and your companion"
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
import { drawDamageNumbers } from "./damage-text";
