import { characterImages } from "./characters";
import { companionCaster, drawCompanion } from "./companion";
import { critterCaster, crittersAt, drawCritter } from "./critters";
import { drawNavigation } from "./navigation";
import { PerformanceGraph } from "./PerformanceGraph";
import { movementFacing } from "./facing";
import { LocalMovement } from "./local-movement";
import { gameAudio } from "./audio";
import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { SnapshotBuffer } from "./snapshots";
import {
  drawPlayerHealth,
  drawParticles,
  drawVignette,
  drawNameBadge,
  drawAtmosphere,
  treeOpacity,
  drawVegetation,
} from "./effects";
import type { Interaction } from "./effects";
import {
  ARENA,
  PATHS,
  LOBBY_PORTAL,
  TICK_MS,
  nearbyInteraction,
  TRAINING_ZONES,
} from "@emberfall/common";
import type { ClientMessage, WorldState } from "@emberfall/common";
import type { GraphicsSettings } from "./graphics";
import { castShadow, makeMask } from "./lighting";
import type { Caster, Light } from "./lighting";
import { villageSprites, TORCH_LIGHTS, lightTexture } from "./village";
import type { Scenery } from "./village";
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
  const canvas = useRef<HTMLCanvasElement>(null);
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
    const ctx = element.getContext("2d", { alpha: false })!;
    const knight = characterImages.warrior.walk;
    const nature = new Image();
    nature.src = "/assets/nature.png";
    const houses = new Image();
    houses.src = "/assets/houses.png";
    const skeleton = new Image();
    skeleton.src = "/assets/skeleton.png";
    const drawForest = forestRenderer(nature, knight, skeleton);
    const audio = gameAudio(() => prefs.current);
    let lastSlashAt = -Infinity,
      lastHit = 0,
      lastWarning = 0;
    let scenery: Scenery[] = [];
    let torchTextures: HTMLCanvasElement[] = [];
    const movingLight = document.createElement("canvas");
    const lanternTexture = document.createElement("canvas");
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
    const positions = new Map<string, { x: number; y: number; facing: number }>();
    const key = (event: KeyboardEvent, down: boolean) => {
      if (document.querySelector("dialog[open]")) return;
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
      if (document.querySelector("dialog[open]")) keys.clear();
      const { x, y } = movement();
      localMovement.input(x, y, performance.now());
    }
    const input = setInterval(sendMovement, TICK_MS);
    const background = document.createElement("canvas");
    background.width = ARENA.width;
    background.height = ARENA.height;
    function paintBackground() {
      const ctx = background.getContext("2d")!;
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#25392f";
      ctx.fillRect(0, 0, 960, 640);
      // A fixed seed keeps the decorative clearing identical for every client.
      let seed = 7319;
      const random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      for (let i = 0; i < 65; i++) {
        const x = random() * ARENA.width;
        const y = random() * ARENA.height;
        const radius = 35 + random() * 110;
        const patch = ctx.createRadialGradient(x, y, 0, x, y, radius);
        patch.addColorStop(0, i % 2 ? "#78905712" : "#0b231c20");
        patch.addColorStop(1, "#25392f00");
        ctx.fillStyle = patch;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
      for (let i = 0; i < 1800; i++) {
        ctx.fillStyle = random() > 0.5 ? "#80965c12" : "#142b2020";
        ctx.fillRect(random() * ARENA.width, random() * ARENA.height, 1 + random() * 3, 1);
      }
      // Wide compacted-earth paths form one connected network between doorways.
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const [width, color] of [
        [42, "#293328"],
        [36, "#6b6248"],
        [28, "#827253"],
      ] as const) {
        ctx.lineWidth = width;
        ctx.strokeStyle = color;
        for (const path of PATHS) {
          ctx.beginPath();
          ctx.moveTo(path[0].x, path[0].y);
          for (const point of path.slice(1)) ctx.lineTo(point.x, point.y);
          ctx.stroke();
        }
      }
      ctx.fillStyle = "#817457";
      ctx.beginPath();
      ctx.ellipse(480, 355, 105, 70, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#b4a17a50";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(480, 355, 92, 58, 0, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 260; i++) {
        const path = PATHS[i % PATHS.length],
          segment = i % (path.length - 1),
          a = path[segment],
          b = path[segment + 1],
          t = random();
        ctx.fillStyle = i % 2 ? "#aea07d45" : "#514b3540";
        ctx.fillRect(
          a.x + (b.x - a.x) * t + random() * 24 - 12,
          a.y + (b.y - a.y) * t + random() * 24 - 12,
          2 + random() * 3,
          2,
        );
      }
      scenery = villageSprites(nature, houses, quality.current);
      for (const object of scenery) {
        if (quality.current.shadows) castShadow(ctx, object);
        if (quality.current.ambientOcclusion && !object.id.startsWith("grass")) {
          ctx.save();
          ctx.translate(object.x, object.y);
          ctx.scale(1, 0.3);
          const radius = object.width * 0.5;
          const ao = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
          ao.addColorStop(0, "#07100980");
          ao.addColorStop(1, "#07100900");
          ctx.fillStyle = ao;
          ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
          ctx.restore();
        }
      }
      torchTextures = TORCH_LIGHTS.map((light) =>
        lightTexture(light, scenery, quality.current.shadows),
      );
    }
    paintBackground();
    nature.onload = paintBackground;
    houses.onload = paintBackground;
    let frame = 0;
    let previous = performance.now();
    let resolutionScale = 1,
      budgetAt = performance.now(),
      frameTotal = 0,
      frameCount = 0;
    const resize = () => {
      const ratio = Math.min(devicePixelRatio * quality.current.resolution * resolutionScale, 3);
      element.width = Math.round(innerWidth * ratio);
      element.height = Math.round(innerHeight * ratio);
    };
    resize();
    window.addEventListener("resize", resize);
    let previousSettings = quality.current;
    let previousScene: string | undefined;
    let fpsAt = performance.now(),
      fpsFrames = 0;
    function draw(now: number) {
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
      const delta = Math.min(0.1, (now - previous) / 1000);
      previous = now;
      if (previousSettings !== quality.current) {
        previousSettings = quality.current;
        resolutionScale = 1;
        paintBackground();
        resize();
      }
      const el = element;
      const scale = Math.max(el.width / ARENA.width, el.height / ARENA.height);
      if (latest.current) snapshots.push(latest.current, now);
      if (document.querySelector("dialog[open]")) keys.clear();
      const view = latest.current ? snapshots.render(now) : null;
      const local = latest.current ? localMovement.render(latest.current, now) : undefined;
      let localSwing = false;
      if (view && local) {
        localSwing = localMovement.animateAttack(local, view, now);
        view.players = view.players.map((player) =>
          player.id === playerId ? { ...local, bear: player.bear } : player,
        );
      }
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
        frame = requestAnimationFrame(draw);
        return;
      }
      const focus = local ?? { x: 480, y: 320 };
      const viewWidth = el.width / scale;
      const viewHeight = el.height / scale;
      const cameraX = Math.max(0, Math.min(ARENA.width - viewWidth, focus.x - viewWidth / 2));
      const cameraY = Math.max(0, Math.min(ARENA.height - viewHeight, focus.y - viewHeight / 2));
      ctx.setTransform(scale, 0, 0, scale, -cameraX * scale, -cameraY * scale);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(background, 0, 0);
      for (const zone of TRAINING_ZONES) {
        ctx.fillStyle = "#aa8b4930";
        ctx.strokeStyle = "#c9a56380";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(zone.x, zone.y, zone.radius, zone.radius * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      const training = view.training;
      const serverTime = view.serverNow ?? now;
      if (training) {
        for (const dummy of training.enemies) {
          if (skeleton.naturalWidth)
            ctx.drawImage(skeleton, 0, 0, 16, 16, dummy.x - 24, dummy.y - 30, 48, 48);
          ctx.fillStyle = "#152018";
          ctx.fillRect(dummy.x - 20, dummy.y - 46, 40, 5);
          ctx.fillStyle = "#df7765";
          ctx.fillRect(dummy.x - 19, dummy.y - 45, (38 * dummy.hitpoints) / dummy.maxHitpoints!, 3);
          drawDebuffs(ctx, dummy, dummy.x - 20, dummy.y - 46, serverTime);
        }
        drawLootAndBlood(ctx, training, serverTime, (x, y) => ({ x, y }), {
          x: cameraX,
          y: cameraY,
          width: viewWidth,
          height: viewHeight,
        });
      }
      const players = view?.players.filter((p) => !p.scene) ?? [];
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
          y: LOBBY_PORTAL.y + 8,
          object: null,
          player: null,
          bear: null,
          critter: null,
          portal: LOBBY_PORTAL,
        },
        ...scenery.map((object) => ({
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
            LOBBY_PORTAL.x,
            LOBBY_PORTAL.y,
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
          ctx.globalAlpha = object.id.startsWith("tree:") ? treeOpacity(object, local) : 1;
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
        const dx = player.x - pos.x;
        const dy = player.y - pos.y;
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
          false,
        );
      }
      if (training) {
        drawClassProjectiles(ctx, training, serverTime, (x, y) => ({ x, y }));
        if (prefs.current.damageNumbers)
          for (const hit of training.damage) {
            const age = serverTime - hit.at;
            if (age < 0 || age > 750) continue;
            ctx.save();
            ctx.globalAlpha = 1 - age / 800;
            ctx.font = 'bold 14px "Alegreya Sans", sans-serif';
            ctx.textAlign = "center";
            ctx.fillStyle = "#fff0b1";
            ctx.fillText(String(hit.amount), hit.x, hit.y - 45 - age / 30);
            ctx.restore();
          }
      }
      if (quality.current.lighting) {
        ctx.save();
        ctx.fillStyle = "#f3ca7a09";
        ctx.fillRect(0, 0, ARENA.width, ARENA.height);
        ctx.globalCompositeOperation = "screen";
        for (let i = 0; i < TORCH_LIGHTS.length; i++) {
          const light = TORCH_LIGHTS[i];
          const texture = torchTextures[i];
          // Cache the static blockers; update only the moving character shadows.
          if (movingLight.width !== light.radius * 2)
            movingLight.width = movingLight.height = light.radius * 2;
          const lightCtx = movingLight.getContext("2d")!;
          lightCtx.resetTransform();
          lightCtx.clearRect(0, 0, movingLight.width, movingLight.height);
          lightCtx.globalCompositeOperation = "source-over";
          lightCtx.drawImage(texture, 0, 0);
          if (quality.current.shadows) {
            lightCtx.translate(light.radius - light.x, light.radius - light.y);
            lightCtx.globalCompositeOperation = "destination-out";
            for (const caster of dynamic) castShadow(lightCtx, caster, light);
          }
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
            lightTexture(
              lantern,
              [...scenery, ...dynamic],
              quality.current.shadows,
              lanternTexture,
            ),
            lantern.x - lantern.radius,
            lantern.y - lantern.radius,
          );
        }
        ctx.restore();
      }
      for (let i = 0; i < TORCH_LIGHTS.length; i++) {
        const light = TORCH_LIGHTS[i];
        ctx.save();
        if (quality.current.bloom) {
          ctx.shadowColor = "#ffbb55";
          ctx.shadowBlur = 13;
        }
        ctx.fillStyle = "#f8ca73";
        ctx.fillRect(light.x - 2, light.y - 58 + Math.sin(now / 140 + i) * 2, 4, 9);
        ctx.restore();
      }
      if (quality.current.particles)
        drawParticles(ctx, cameraX, cameraY, viewWidth, viewHeight, now);
      if (quality.current.fog) drawFog(ctx, cameraX, cameraY, viewWidth, viewHeight, now);
      drawAtmosphere(ctx, cameraX, cameraY, viewWidth, viewHeight, now, quality.current);
      if (quality.current.vignette) drawVignette(ctx, cameraX, cameraY, viewWidth, viewHeight);
      drawNavigation(ctx, view, playerId);
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => {
      nature.onload = houses.onload = null;
      cancelAnimationFrame(frame);
      clearInterval(input);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", reset);
      document.removeEventListener("visibilitychange", reset);

      audio.dispose();
    };
  }, [playerId, interaction, onHitpoints]);
  return (
    <>
      <canvas
        ref={canvas}
        onContextMenu={(event) => event.preventDefault()}
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
          aria-label="Damage per second"
          title="Your damage over the last 5 seconds, including ailments and your companion"
        >
          <strong>
            {(world.players.find((player) => player.id === playerId)?.dps ?? 0).toFixed(1)} DPS
          </strong>
          <small>Last 5 seconds</small>
        </aside>
      )}
    </>
  );
}
