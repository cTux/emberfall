import type { PixiContext } from "./rendering/pixi-context";
import { characterImages } from "./characters";
import { ACTOR_CELL, playerFrame, enemyFrame, idleBreath } from "./animation";
import { actorArt, environmentArt, terrainArt, terrainTile } from "./art";
import { portalArt, drawStonePortal } from "./ambient-art";
import { companionCaster, drawCompanion } from "./companion";
import { critterCaster, crittersAt, drawCritter } from "./critters";
import { drawNavigation } from "./navigation";
import { drawHitboxes } from "./hitboxes";
import type { Interaction } from "./effects";
import {
  bloodPuddleRenderer,
  drawLootAndBlood,
  drawClassProjectiles,
  drawDebuffs,
} from "./combat-effects";
import { defaultSpellRange, characterStats, PLAYER_ATTACK_DURATION } from "@emberfall/common-new";
import { movementFacing } from "./facing";
import { drawDanger } from "./danger";
import {
  enemyMaxHealth,
  ENEMY_STATS,
  FOREST,
  forestTrees,
  wrappedDelta,
} from "@emberfall/common-new";
import type { WorldState, Player } from "@emberfall/common-new";
import type { GraphicsSettings } from "./graphics";
import type { Preferences } from "./preferences";
import { makeMask, castShadow, spriteMask } from "./lighting";
import type { Caster } from "./lighting";
import { lightTexture } from "./village";
import {
  drawPlayerHealth,
  drawChatBubble,
  drawNameBadge,
  drawParticles,
  drawVignette,
  drawTargetHit,
  drawDamageFlash,
  drawAtmosphere,
  obstacleOpacity,
  drawVegetation,
} from "./effects";

const portalSilhouette = document.createElement("canvas");
portalSilhouette.width = 50;
portalSilhouette.height = 76;
const portalContext = portalSilhouette.getContext("2d")!;
portalContext.fillStyle = "#347fe0";
portalContext.beginPath();
portalContext.ellipse(25, 38, 25, 38, 0, 0, Math.PI * 2);
portalContext.fill();
const portalMask = makeMask(portalSilhouette);

export function drawPortal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  now: number,
  bloom: boolean,
  name: string,
  active: boolean,
  shadows: boolean,
  _waving: boolean,
  opacity = 1,
) {
  if (portalArt.naturalWidth) {
    if (shadows)
      castShadow(ctx, {
        id: "portal",
        x,
        y: y + 8,
        width: 64,
        height: 80,
        mask: spriteMask(portalArt, 0, 0, false, 128, false, 128)!,
      });
    ctx.save();
    ctx.globalAlpha = opacity;
    if (bloom) {
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#53c9ff";
    }
    drawStonePortal(ctx, x - 32, y - 72, 64, 80, now);
    ctx.restore();
    drawNameBadge(ctx, x, y - 72, name, active);
    return;
  }
  if (shadows)
    castShadow(ctx, { id: "portal", x, y: y + 8, width: 50, height: 76, mask: portalMask });
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(x, y);
  ctx.lineWidth = 4;
  if (!shadows) {
    ctx.fillStyle = "#162e4d";
    ctx.beginPath();
    ctx.ellipse(0, 1, 31, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  if (bloom) {
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#53c9ff";
  }
  ctx.fillStyle = "#101e68";
  ctx.beginPath();
  ctx.ellipse(0, -30, 25, 38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.shadowBlur = 0;
  const colors = ["#101e68", "#182c86", "#2042a6", "#285ac5", "#347fe0", "#52b4f5", "#8cddff"];
  const time = now / 1600;
  for (let py = -68; py < 8; py += 3) {
    for (let px = -25; px < 25; px += 3) {
      const u = px / 12,
        v = (py + 30) / 12;
      const ripple = Math.sin(u * 2 + Math.sin(v * 1.7 - time) * 2 + Math.sin(u + v + time * 0.6));
      const brightness = (ripple + Math.sin(v * 2 - time + Math.sin(u + time))) / 2;
      ctx.fillStyle = colors[Math.floor(((brightness + 1) / 2) * (colors.length - 1))];
      ctx.fillRect(px, py, 3, 3);
    }
  }
  ctx.restore();
  ctx.strokeStyle = "#8cddff";
  ctx.lineWidth = 2;
  ctx.stroke();
  for (let i = 0; i < 24; i++) {
    const age = ((now + i * 137) % 1800) / 1800,
      angle = i * 2.399963;
    ctx.globalAlpha = Math.sin(age * Math.PI) * 0.8;
    ctx.fillStyle = i % 3 === 0 ? "#b3efff" : "#52b4f5";
    ctx.fillRect(
      Math.round(Math.cos(angle) * (18 + age * 28)),
      Math.round(-30 + Math.sin(angle) * 28 - age * 35),
      2,
      2,
    );
  }
  ctx.restore();
  ctx.restore();
  drawNameBadge(ctx, x, y - 60, name, active);
}
const fogTexture = document.createElement("canvas");
fogTexture.width = fogTexture.height = 512;
const fogContext = fogTexture.getContext("2d")!;
for (let i = 0; i < 36; i++) {
  for (const offsetX of [-512, 0, 512])
    for (const offsetY of [-512, 0, 512]) {
      const x = ((i * 137) % 512) + offsetX,
        y = ((i * 211) % 512) + offsetY;
      const gradient = fogContext.createRadialGradient(x, y, 0, x, y, 100);
      gradient.addColorStop(0, "#b4cfdc12");
      gradient.addColorStop(1, "#b4cfdc00");
      fogContext.fillStyle = gradient;
      fogContext.fillRect(x - 100, y - 100, 200, 200);
    }
}
export function drawFog(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  now: number,
) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  // World-space tiles: the camera only selects which volumes to draw.
  for (let layer = 0; layer < 2; layer++) {
    const tileWidth = layer ? 1600 : 960,
      tileHeight = layer ? 1280 : 640,
      offsetX = (now / (100 + layer * 70)) % tileWidth,
      offsetY = Math.sin(now / 18000 + layer) * 70;
    for (
      let row = Math.floor((y - offsetY) / tileHeight);
      row <= Math.ceil((y + height - offsetY) / tileHeight);
      row++
    )
      for (
        let col = Math.floor((x - offsetX) / tileWidth);
        col <= Math.ceil((x + width - offsetX) / tileWidth);
        col++
      )
        ctx.drawImage(
          fogTexture,
          col * tileWidth + offsetX,
          row * tileHeight + offsetY,
          tileWidth,
          tileHeight,
        );
  }
  ctx.restore();
}

export function forestRenderer(
  _nature: HTMLImageElement,
  _knight: HTMLImageElement,
  skeleton: HTMLImageElement,
) {
  const enemyImages = Object.fromEntries(
    ["runner", "brute", "caster", "warden"].map((name) => [name, actorArt(name)]),
  );
  const tree = document.createElement("canvas");
  tree.width = tree.height = 128;
  let treeMask: HTMLCanvasElement | undefined;
  const ground = document.createElement("canvas");
  ground.width = ground.height = 320;
  const g = ground.getContext("2d")!;
  g.fillStyle = "#22392d";
  g.fillRect(0, 0, 320, 320);
  let seed = 512;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 700; i++) {
    g.fillStyle = i % 3 ? "#49654332" : "#132c2544";
    g.fillRect(random() * 320, random() * 320, 2 + random() * 6, 1 + random() * 3);
  }
  const positions = new Map<string, { x: number; y: number; facing: number }>();
  const drawBloodPuddles = bloodPuddleRenderer();
  let lastScene: string | undefined;
  function mask(image: HTMLImageElement, column: number, row: number) {
    return spriteMask(image, column, row, false, ACTOR_CELL, false, ACTOR_CELL)!;
  }
  return (
    ctx: CanvasRenderingContext2D,
    world: WorldState | null,
    playerId: string,
    quality: GraphicsSettings,
    prefs: Preferences,
    now: number,
    _dt: number,
    interaction: Interaction | null,
  ) => {
    if (world?.scene?.id !== lastScene) {
      positions.clear();
      lastScene = world?.scene?.id;
    }
    const serverTime = world?.scene?.pausedAt ?? world?.serverNow ?? 0;
    if (
      environmentArt.naturalWidth &&
      terrainArt.complete &&
      terrainArt.naturalWidth &&
      !treeMask
    ) {
      tree.getContext("2d")!.drawImage(environmentArt, 0, 128, 128, 128, 0, 0, 128, 128);
      treeMask = makeMask(tree);
      g.fillStyle = g.createPattern(terrainTile(2), "repeat")!;
      g.fillRect(0, 0, 320, 320);
    }
    const scale = Math.max(ctx.canvas.width / 960, ctx.canvas.height / 640),
      width = ctx.canvas.width / scale,
      height = ctx.canvas.height / scale;
    const me = world?.players.find((p) => p.id === playerId);
    const focus = me ?? { x: 2400 + Math.sin(now / 25000) * 70, y: 1280 };
    const cx = focus.x,
      cy = focus.y;
    const cameraX = cx - width / 2,
      cameraY = cy - height / 2;
    const near = (x: number, y: number) => ({
      x: cx + wrappedDelta(x, cx, FOREST.width),
      y: cy + wrappedDelta(y, cy, FOREST.height),
    });
    ctx.setTransform(scale, 0, 0, scale, -cameraX * scale, -cameraY * scale);
    ctx.imageSmoothingEnabled = false;
    for (let row = Math.floor(cameraY / 320); row <= (cameraY + height) / 320; row++)
      for (let col = Math.floor(cameraX / 320); col <= (cameraX + width) / 320; col++)
        ctx.drawImage(ground, col * 320, row * 320);
    drawBloodPuddles(ctx, world?.scene, serverTime, prefs.bloodPuddles, near, {
      x: cameraX,
      y: cameraY,
      width,
      height,
    });
    const trees = forestTrees(cx, cy, Math.max(width, height) / 2 + 150).filter(
      (t) =>
        t.x > cameraX - 100 &&
        t.x < cameraX + width + 100 &&
        t.y > cameraY - 50 &&
        t.y < cameraY + height + 150,
    );
    const casters: Caster[] = treeMask
      ? trees.map((t) => ({
          id: t.id,
          x: t.x,
          y: t.y,
          width: t.size,
          height: t.size,
          mask: treeMask!,
        }))
      : [];
    const players = world?.players.filter((p) => p.scene === "forest") ?? [];
    const actors = [
      ...players.map((p) => ({ id: p.id, x: p.x, y: p.y, player: p, enemy: null })),
      ...(world?.scene?.enemies ?? []).map((e) => ({
        id: `enemy:${e.id}`,
        x: e.x,
        y: e.y,
        player: null,
        enemy: e,
      })),
      ...(
        world?.scene?.damage.filter(
          (d) => d.killed && d.target.startsWith("enemy:") && serverTime - d.at < 700,
        ) ?? []
      ).map((d) => ({
        id: d.target,
        x: d.x,
        y: d.y,
        player: null,
        enemy: {
          name: undefined,
          debuffs: undefined,
          attack: undefined,
          cooldownUntil: undefined,
          archetype: "skeleton" as const,
          id: 0,
          x: d.x,
          y: d.y,
          hitpoints: 0,
          angle: 0,
          kind: "normal" as const,
          ...d.enemy,
        },
      })),
    ];
    const live = new Set(actors.map((a) => a.id));
    for (const id of positions.keys()) if (!live.has(id)) positions.delete(id);
    const damageByTarget = new Map(world?.scene?.damage.map((d) => [d.target, d]));
    const rendered = actors
      .filter(
        (a) =>
          Math.abs(wrappedDelta(a.x, cx, FOREST.width)) < width / 2 + 100 &&
          Math.abs(wrappedDelta(a.y, cy, FOREST.height)) < height / 2 + 100,
      )
      .map((actor) => {
        const pos = positions.get(actor.id) ?? { x: actor.x, y: actor.y, facing: 0 };
        const dx = wrappedDelta(actor.x, pos.x, FOREST.width),
          dy = wrappedDelta(actor.y, pos.y, FOREST.height);
        const ix = actor.player ? (actor.player.inputX ?? 0) : Math.cos(actor.enemy!.angle),
          iy = actor.player ? (actor.player.inputY ?? 0) : Math.sin(actor.enemy!.angle);
        const moving = actor.player ? Math.hypot(ix, iy) > 0 : Math.hypot(dx, dy) > 0.05;
        if (moving && Math.hypot(ix, iy) > 0) pos.facing = movementFacing(ix, iy, pos.facing);
        pos.x = actor.x;
        pos.y = actor.y;
        positions.set(actor.id, pos);
        const actorTime = actor.id === playerId ? now : serverTime;
        const point = near(pos.x, pos.y),
          row = actor.player
            ? playerFrame(actorTime, moving, actor.player.hitpoints > 0, actor.player.attackAt)
            : enemyFrame(
                serverTime,
                moving,
                actor.enemy!.hitpoints > 0,
                actor.enemy!.attack,
                (actor.enemy!.cooldownUntil ?? -Infinity) -
                  ENEMY_STATS[actor.enemy!.archetype ?? "skeleton"].cooldown,
              ),
          image = actor.player
            ? characterImages[actor.player.classId ?? "warrior"].walk
            : actor.enemy?.kind === "boss"
              ? enemyImages.warden
              : (enemyImages[actor.enemy?.archetype ?? "skeleton"] ?? skeleton);
        const size = actor.enemy ? ENEMY_STATS[actor.enemy.archetype ?? "skeleton"].size : 48;
        if (row === 5 || row === 6) {
          const angle = actor.player?.attackAngle ?? actor.enemy?.angle ?? 0;
          pos.facing = movementFacing(Math.cos(angle), Math.sin(angle), pos.facing);
        }
        if (image.naturalWidth)
          casters.push({
            id: actor.id,
            x: point.x,
            y: point.y + 15,
            width: size,
            height: size,
            mask: mask(image, pos.facing, row),
          });
        return { ...actor, ...point, facing: pos.facing, row, image, size, moving, dx, dy };
      })
      .filter((a) => Math.abs(a.x - cx) < width / 2 + 80 && Math.abs(a.y - cy) < height / 2 + 80);
    const critters = crittersAt("forest", world ? serverTime : now, {
      x: cameraX,
      y: cameraY,
      width,
      height,
    });
    for (const critter of critters) {
      const caster = critterCaster(critter);
      if (caster) casters.push(caster);
    }
    for (const player of players) {
      if (!player.bear) continue;
      const point = near(player.bear.x, player.bear.y);
      const caster = companionCaster(
        player.bear,
        point.x,
        point.y,
        serverTime,
        `bear:${player.id}`,
      );
      if (caster) casters.push(caster);
    }
    if (quality.shadows) for (const caster of casters) castShadow(ctx, caster);
    if (!quality.shadows) {
      ctx.fillStyle = "#07120955";
      for (const t of trees) {
        ctx.beginPath();
        ctx.ellipse(t.x, t.y, 23, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (world?.scene) drawDanger(ctx, world.scene, serverTime, near);
    if (world?.scene)
      drawLootAndBlood(ctx, world.scene, serverTime, near, {
        x: cameraX,
        y: cameraY,
        width,
        height,
      });
    const layers = [
      ...(world?.scene?.phase === "ended" ? world.scene.portals : []).map((portal) => ({
        y: near(portal.x, portal.y).y + 8,
        tree: null,
        actor: null,
        bear: null,
        critter: null,
        portal,
      })),
      ...trees.map((t) => ({
        y: t.y,
        tree: t,
        actor: null,
        bear: null,
        critter: null,
        portal: null,
      })),
      ...rendered.map((a) => ({
        y: a.y + 15,
        tree: null,
        actor: a,
        bear: null,
        critter: null,
        portal: null,
      })),
      ...players.flatMap((p) =>
        p.bear
          ? [
              {
                y: near(p.bear.x, p.bear.y).y + 18,
                tree: null,
                actor: null,
                bear: p.bear,
                critter: null,
                portal: null,
              },
            ]
          : [],
      ),
      ...critters.map((critter) => ({
        y: critter.y,
        tree: null,
        actor: null,
        bear: null,
        critter,
        portal: null,
      })),
    ].sort((a, b) => a.y - b.y);
    for (const layer of layers) {
      if (layer.portal) {
        const portal = layer.portal;
        const point = near(portal.x, portal.y);
        drawPortal(
          ctx,
          point.x,
          point.y,
          now,
          quality.bloom,
          "Return to village",
          interaction?.id === "return" && interaction.x === portal.x && interaction.y === portal.y,
          quality.shadows,
          quality.wavingVegetation,
          obstacleOpacity({ x: point.x, y: point.y + 8, width: 64, height: 80 }, me),
        );
        continue;
      }
      if (layer.critter) {
        ctx.globalAlpha = obstacleOpacity({ ...layer.critter, width: 24, height: 24 }, me);
        drawCritter(ctx, layer.critter, quality.shadows);
        ctx.globalAlpha = 1;
        continue;
      }
      if (layer.bear) {
        const point = near(layer.bear.x, layer.bear.y);
        drawCompanion(
          ctx,
          layer.bear,
          point.x,
          point.y,
          serverTime,
          quality.shadows,
          obstacleOpacity({ x: point.x, y: point.y + 18, width: 42.5, height: 40 }, me),
        );
        continue;
      }
      if (layer.tree) {
        const t = layer.tree;
        ctx.globalAlpha = obstacleOpacity({ ...t, width: t.size, height: t.size }, me);
        if (treeMask) {
          drawVegetation(ctx, tree, t.x, t.y, t.size, t.size, now, quality.wavingVegetation);
        }
        ctx.globalAlpha = 1;
        continue;
      }
      const a = layer.actor!;
      if (!a.image.naturalWidth) continue;
      const hit = damageByTarget.get(a.id);
      if (a.enemy?.hitpoints === 0 && hit?.killed) {
        const progress = Math.max(0, Math.min(1, (serverTime - hit.at) / 700));
        ctx.save();
        ctx.translate(a.x, a.y + 15);
        ctx.globalAlpha =
          (1 - progress) *
          obstacleOpacity({ x: a.x, y: a.y + 15, width: a.size, height: a.size }, me);
        ctx.drawImage(
          a.image,
          a.facing * ACTOR_CELL,
          7 * ACTOR_CELL,
          ACTOR_CELL,
          ACTOR_CELL,
          -a.size / 2,
          -a.size * 0.94,
          a.size,
          a.size,
        );
        drawTargetHit(
          ctx,
          mask(a.image, a.facing, 7),
          -a.size / 2,
          -a.size * 0.94,
          a.size,
          a.size,
          serverTime - hit.at,
        );
        ctx.restore();
        continue;
      }
      const left = a.x - a.size / 2,
        top = a.y + 15 - (a.size * 45) / 48;
      const opacity =
        a.id === playerId
          ? 1
          : obstacleOpacity({ x: a.x, y: a.y + 15, width: a.size, height: a.size }, me);
      const bodyOpacity = opacity * (a.player?.hitpoints === 0 ? 0.35 : 1);
      ctx.globalAlpha = bodyOpacity;
      if (quality.motionBlur && a.moving) {
        ctx.globalAlpha = 0.13 * bodyOpacity;
        ctx.drawImage(
          a.image,
          a.facing * ACTOR_CELL,
          a.row * ACTOR_CELL,
          ACTOR_CELL,
          ACTOR_CELL,
          left - a.dx * 0.7,
          top - a.dy * 0.7,
          a.size,
          a.size,
        );
        ctx.globalAlpha = bodyOpacity;
      }
      (ctx as unknown as PixiContext).spriteTint = a.player?.reconnecting ? "#ff5555" : "#ffffff";
      const breath = idleBreath(now, a.row);
      ctx.drawImage(
        a.image,
        a.facing * ACTOR_CELL,
        a.row * ACTOR_CELL,
        ACTOR_CELL,
        ACTOR_CELL,
        left,
        top + a.size * (1 - breath),
        a.size,
        a.size * breath,
      );
      (ctx as unknown as PixiContext).spriteTint = "#ffffff";
      if (hit && (a.enemy || a.player?.id === playerId))
        drawTargetHit(
          ctx,
          mask(a.image, a.facing, a.row),
          left,
          top,
          a.size,
          a.size,
          serverTime - hit.at,
        );
      ctx.globalAlpha = 1;
      if (a.enemy) {
        if (a.enemy.kind === "boss") {
          const width = drawPlayerHealth(
            ctx,
            a.x,
            top - 10,
            a.enemy.hitpoints,
            enemyMaxHealth(a.enemy),
            a.enemy.name ?? "The Hollow Warden",
            "#ffffff",
            true,
          );
          drawDebuffs(ctx, a.enemy, a.x - width / 2, top - 10, serverTime);
        } else {
          ctx.fillStyle = "#102020";
          ctx.fillRect(a.x - 17, top - 8, 34, 5);
          ctx.fillStyle = a.enemy.kind === "elite" ? "#f4d447" : "#df7765";
          ctx.fillRect(a.x - 16, top - 7, (32 * a.enemy.hitpoints) / enemyMaxHealth(a.enemy), 3);
          drawDebuffs(ctx, a.enemy, a.x - 17, top - 8, serverTime);
        }
      }
      if (a.player)
        drawPlayerDetails(
          ctx,
          a.player,
          a.x,
          a.y,
          a.facing,
          a.player.id === playerId ? now : serverTime,
          quality.bloom,
          world?.scene?.phase === "active",
        );
    }
    if (world?.scene) drawClassProjectiles(ctx, world.scene, serverTime, near);
    if (quality.lighting) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      for (const p of rendered.filter((a) => a.player && a.player.hitpoints > 0)) {
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
    if (quality.particles) drawParticles(ctx, cameraX, cameraY, width, height, now);
    if (quality.fog) drawFog(ctx, cameraX, cameraY, width, height, now);
    drawAtmosphere(ctx, cameraX, cameraY, width, height, now, quality);
    if (world?.scene) drawDanger(ctx, world.scene, serverTime, near, true);
    if (quality.vignette) drawVignette(ctx, cameraX, cameraY, width, height);
    if (prefs.damageNumbers) drawDamageNumbers(ctx, world?.scene?.damage ?? [], near, serverTime);
    drawDamageFlash(ctx, world, playerId);
    if (world) drawNavigation(ctx, world, playerId);
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
export function drawPlayerDetails(
  ctx: CanvasRenderingContext2D,
  p: Player,
  x: number,
  y: number,
  facing: number,
  now: number,
  bloom: boolean,
  inCombat: boolean,
  showVitals = true,
) {
  if (showVitals) {
    drawPlayerHealth(ctx, x, y - 46, p.hitpoints, p.maxHitpoints, p.name);
  }
  if (p.reconnecting) {
    ctx.save();
    ctx.font = 'bold 10px "Alegreya Sans", sans-serif';
    ctx.textAlign = "center";
    ctx.fillStyle = "#ff5555";
    ctx.strokeStyle = "#101817";
    ctx.lineWidth = 3;
    ctx.strokeText("Reconnecting", x, y - 62);
    ctx.fillText("Reconnecting", x, y - 62);
    ctx.restore();
    return;
  }
  const age = now - (p.attackAt ?? -Infinity);
  if (!characterStats(p).hasWeapon) return;
  const attackRange = defaultSpellRange(p);
  const attacking = inCombat && age >= 0 && age < PLAYER_ATTACK_DURATION;
  // Class weapons are painted into the directional action frames.
  if (attacking && p.hitpoints > 0) {
    if (p.classId === "ranger" || p.classId === "mage" || p.classId === "druid") {
      return;
    }
    const progress = age / PLAYER_ATTACK_DURATION,
      angle = (p.attackAngle ?? 0) - Math.PI / 2 + progress * Math.PI;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    if (bloom) {
      ctx.shadowColor = "#c3edff";
      ctx.shadowBlur = 10;
    }
    ctx.strokeStyle = `rgba(195,237,255,${1 - progress * 0.7})`;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(0, attackRange - 5), -0.65, 0);
    ctx.stroke();
    ctx.fillStyle = "#a8ffce";
    for (let i = 0; i < 10; i++) {
      ctx.globalAlpha = (1 - progress) * (1 - i / 14);
      ctx.fillRect(30 + i * 5 + progress * 12, Math.sin(i * 2.4) * (4 + progress * 24), 2, 2);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
import { drawDamageNumbers } from "./damage-text";
