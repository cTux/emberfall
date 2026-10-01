import { characterImages } from "./characters";
import { drawCompanion } from "./companion";
import { crittersAt, drawCritter } from "./critters";
import { drawNavigation } from "./navigation";
import type { Interaction } from "./effects";
import { drawLootAndBlood, drawClassProjectiles, drawDebuffs } from "./combat-effects";
import { PLAYER_ATTACK_RANGE, PLAYER_ATTACK_DURATION } from "@emberfall/common";
import { movementFacing } from "./facing";
import { drawDanger, drawPlayerRange } from "./danger";
import { enemyMaxHealth, ENEMY_STATS, FOREST, forestTrees, wrappedDelta } from "@emberfall/common";
import type { WorldState, Player } from "@emberfall/common";
import type { GraphicsSettings } from "./graphics";
import type { Preferences } from "./preferences";
import { makeMask, castShadow } from "./lighting";
import type { Caster } from "./lighting";
import { lightTexture } from "./village";
import {
  drawPlayerHealth,
  drawNameBadge,
  drawParticles,
  drawVignette,
  hitOutline,
  drawDamageFlash,
  drawAtmosphere,
  treeOpacity,
} from "./effects";

export function drawPortal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  now: number,
  bloom: boolean,
  name: string,
  active: boolean,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = 4;
  ctx.fillStyle = "#162e4d";
  ctx.beginPath();
  ctx.ellipse(0, 1, 31, 12, 0, 0, Math.PI * 2);
  ctx.fill();
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
  nature: HTMLImageElement,
  _knight: HTMLImageElement,
  skeleton: HTMLImageElement,
) {
  const enemyImages = Object.fromEntries(
    ["runner", "brute", "caster"].map((name) => {
      const image = new Image();
      image.src = `/assets/${name}.png`;
      return [name, image];
    }),
  );
  const tree = document.createElement("canvas");
  tree.width = tree.height = 32;
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
  const lanternTexture = document.createElement("canvas");
  const positions = new Map<string, { x: number; y: number; facing: number }>();
  let lastScene: string | undefined;
  const masks = new Map<string, HTMLCanvasElement>();
  const outlines = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
  function mask(image: HTMLImageElement, column: number, row: number) {
    const key = image.src + column + ":" + row;
    if (!masks.has(key)) {
      const tile = document.createElement("canvas");
      tile.width = tile.height = 16;
      tile.getContext("2d")!.drawImage(image, column * 16, row * 16, 16, 16, 0, 0, 16, 16);
      masks.set(key, makeMask(tile));
    }
    return masks.get(key)!;
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
    const serverTime = world?.serverNow ?? 0;
    if (nature.naturalWidth && !treeMask) {
      tree.getContext("2d")!.drawImage(nature, 32, 0, 32, 32, 0, 0, 32, 32);
      treeMask = makeMask(tree);
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
    if (quality.grass && nature.naturalWidth)
      for (const t of trees)
        for (let i = 0; i < 5; i++)
          ctx.drawImage(
            nature,
            64,
            160,
            16,
            16,
            t.x - 65 + ((i * 41) % 120),
            t.y - 80 + ((i * 67) % 145),
            16,
            16,
          );
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
        const attacking =
          actor.player &&
          actorTime - (actor.player.attackAt ?? -Infinity) >= 0 &&
          actorTime - (actor.player.attackAt ?? -Infinity) < PLAYER_ATTACK_DURATION;
        const point = near(pos.x, pos.y),
          row = attacking ? 0 : moving ? Math.floor(now / 120) % 4 : 0,
          image = actor.player
            ? characterImages[actor.player.classId ?? "warrior"][attacking ? "attack" : "walk"]
            : (enemyImages[actor.enemy?.archetype ?? "skeleton"] ?? skeleton);
        const size = actor.enemy ? ENEMY_STATS[actor.enemy.archetype ?? "skeleton"].size : 48;
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
    if (quality.shadows) for (const caster of casters) castShadow(ctx, caster);
    if (quality.ambientOcclusion) {
      ctx.fillStyle = "#07120955";
      for (const t of trees) {
        ctx.beginPath();
        ctx.ellipse(t.x, t.y, 23, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (world?.scene?.phase === "ended")
      for (const portal of world.scene.portals) {
        const point = near(portal.x, portal.y);
        drawPortal(
          ctx,
          point.x,
          point.y,
          now,
          quality.bloom,
          "Return to village",
          interaction?.id === "return" && interaction.x === portal.x && interaction.y === portal.y,
        );
      }
    if (world?.scene) drawDanger(ctx, world.scene, serverTime, near);
    if (world?.scene?.phase === "active")
      for (const actor of rendered)
        if (actor.player && actor.player.hitpoints > 0)
          drawPlayerRange(
            ctx,
            actor.player,
            actor.x,
            actor.y,
            actor.player.id === playerId ? now : serverTime,
          );
    if (world?.scene)
      drawLootAndBlood(ctx, world.scene, serverTime, near, {
        x: cameraX,
        y: cameraY,
        width,
        height,
      });
    const layers = [
      ...trees.map((t) => ({ y: t.y, tree: t, actor: null, bear: null, critter: null })),
      ...rendered.map((a) => ({ y: a.y + 15, tree: null, actor: a, bear: null, critter: null })),
      ...players.flatMap((p) =>
        p.bear
          ? [
              {
                y: near(p.bear.x, p.bear.y).y + 15,
                tree: null,
                actor: null,
                bear: p.bear,
                critter: null,
              },
            ]
          : [],
      ),
      ...crittersAt("forest", world ? serverTime : now, {
        x: cameraX,
        y: cameraY,
        width,
        height,
      }).map((critter) => ({ y: critter.y, tree: null, actor: null, bear: null, critter })),
    ].sort((a, b) => a.y - b.y);
    for (const layer of layers) {
      if (layer.critter) {
        drawCritter(ctx, layer.critter);
        continue;
      }
      if (layer.bear) {
        const point = near(layer.bear.x, layer.bear.y);
        drawCompanion(ctx, layer.bear, point.x, point.y, serverTime);
        continue;
      }
      if (layer.tree) {
        const t = layer.tree;
        ctx.globalAlpha = treeOpacity({ ...t, width: t.size, height: t.size }, me);
        if (treeMask) ctx.drawImage(tree, t.x - t.size / 2, t.y - t.size, t.size, t.size);
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
        ctx.rotate(((a.facing === 2 ? -1 : 1) * progress * Math.PI) / 2);
        ctx.scale(1, 1 - progress * 0.35);
        ctx.globalAlpha = 1 - progress;
        ctx.drawImage(
          a.image,
          a.facing * 16,
          0,
          16,
          16,
          -a.size / 2,
          -a.size * 0.94,
          a.size,
          a.size,
        );
        ctx.restore();
        continue;
      }
      const left = a.x - a.size / 2,
        top = a.y + 15 - (a.size * 45) / 48;
      if (hit && serverTime - hit.at < 220) {
        const silhouette = mask(a.image, a.facing, a.row);
        if (!outlines.has(silhouette)) outlines.set(silhouette, hitOutline(silhouette));
        ctx.globalAlpha = 1 - (serverTime - hit.at) / 220;
        ctx.drawImage(outlines.get(silhouette)!, left - 6, top - 6, a.size + 12, a.size + 12);
        ctx.globalAlpha = 1;
      }
      ctx.globalAlpha = a.player?.hitpoints === 0 ? 0.35 : 1;
      if (quality.motionBlur && a.moving) {
        ctx.globalAlpha = 0.13;
        ctx.drawImage(
          a.image,
          a.facing * 16,
          a.row * 16,
          16,
          16,
          left - a.dx * 0.7,
          top - a.dy * 0.7,
          a.size,
          a.size,
        );
        ctx.globalAlpha = 1;
      }
      ctx.drawImage(a.image, a.facing * 16, a.row * 16, 16, 16, left, top, a.size, a.size);
      ctx.globalAlpha = 1;
      if (a.enemy) {
        drawDebuffs(ctx, a.enemy, a.x, top - 11, serverTime);
        if (a.enemy.kind === "boss")
          drawNameplate(
            ctx,
            a.enemy.name ?? "The Hollow Warden",
            a.x,
            top - (a.enemy.debuffs?.length ? 50 : 32),
          );
        ctx.fillStyle = "#102020";
        ctx.fillRect(a.x - 17, top - 8, 34, 5);
        ctx.fillStyle =
          a.enemy.kind === "boss" ? "#ff9638" : a.enemy.kind === "elite" ? "#f4d447" : "#df7765";
        ctx.fillRect(a.x - 16, top - 7, (32 * a.enemy.hitpoints) / enemyMaxHealth(a.enemy), 3);
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
        ctx.drawImage(
          lightTexture(light, casters, quality.shadows, lanternTexture),
          light.x - 110,
          light.y - 110,
        );
      }
      ctx.restore();
    }
    if (quality.particles) drawParticles(ctx, cameraX, cameraY, width, height, now);
    if (quality.fog) drawFog(ctx, cameraX, cameraY, width, height, now);
    drawAtmosphere(ctx, cameraX, cameraY, width, height, now, quality);
    if (world?.scene) drawDanger(ctx, world.scene, serverTime, near, true);
    if (quality.vignette) drawVignette(ctx, cameraX, cameraY, width, height);
    if (prefs.damageNumbers)
      for (const hit of world?.scene?.damage ?? []) {
        const age = serverTime - hit.at;
        if (age > 750) continue;
        const p = near(hit.x, hit.y);
        ctx.globalAlpha = 1 - age / 800;
        ctx.font = "bold 14px system-ui";
        ctx.textAlign = "center";
        ctx.fillStyle = hit.target.startsWith("enemy:") ? "#fff0b1" : "#ff8b81";
        ctx.fillText(String(hit.amount), p.x, p.y - 45 - age / 30);
        ctx.globalAlpha = 1;
      }
    drawDamageFlash(ctx, world, playerId);
    if (world) drawNavigation(ctx, world, playerId);
  };
}
function drawPlayerDetails(
  ctx: CanvasRenderingContext2D,
  p: Player,
  x: number,
  y: number,
  facing: number,
  now: number,
  bloom: boolean,
) {
  const belt = x + (facing === 2 ? -15 : 12);
  ctx.fillStyle = "#493b27";
  ctx.fillRect(belt - 3, y + 1, 7, 11);
  ctx.fillStyle = "#ffe2a0";
  ctx.fillRect(belt - 1, y + 3, 4, 7);
  drawNameplate(ctx, p.name, x, y - 51);
  drawPlayerHealth(ctx, x, y - 32, p.hitpoints, p.maxHitpoints);
  const age = now - (p.attackAt ?? 0);
  if (age >= 0 && age < PLAYER_ATTACK_DURATION && p.hitpoints > 0) {
    if (p.classId === "ranger" || p.classId === "mage" || p.classId === "druid") {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(p.attackAngle ?? 0);
      const pull = Math.sin((age / PLAYER_ATTACK_DURATION) * Math.PI);
      if (p.classId === "ranger") {
        ctx.strokeStyle = "#caa46a";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(15, 0, 15, -1.2, 1.2);
        ctx.stroke();
        ctx.strokeStyle = "#e8ebcf";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(20, -14);
        ctx.lineTo(17 - pull * 8, 0);
        ctx.lineTo(20, 14);
        ctx.stroke();
      } else {
        ctx.fillStyle = "#815636";
        ctx.fillRect(8, -3, 28, 5);
        ctx.fillStyle = p.classId === "druid" ? "#9deb65" : "#ffce70";
        ctx.beginPath();
        ctx.arc(36, 0, 5 + pull * 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
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
    ctx.arc(0, 0, PLAYER_ATTACK_RANGE - 5, -0.65, 0);
    ctx.stroke();
    ctx.fillStyle = "#a8ffce";
    for (let i = 0; i < 10; i++) {
      ctx.globalAlpha = (1 - progress) * (1 - i / 14);
      ctx.fillRect(30 + i * 5 + progress * 12, Math.sin(i * 2.4) * (4 + progress * 24), 2, 2);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#e5f3fa";
    ctx.beginPath();
    ctx.moveTo(18, -3);
    ctx.lineTo(PLAYER_ATTACK_RANGE, 0);
    ctx.lineTo(18, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#b29256";
    ctx.fillRect(16, -8, 4, 16);
    ctx.fillStyle = "#604a32";
    ctx.fillRect(7, -2, 10, 4);
    ctx.restore();
  }
}

function drawNameplate(ctx: CanvasRenderingContext2D, name: string, x: number, y: number) {
  ctx.font = "12px system-ui";
  ctx.textAlign = "center";
  const width = Math.ceil(ctx.measureText(name).width) + 12;
  ctx.fillStyle = "#101817cc";
  ctx.fillRect(x - width / 2, y, width, 18);
  ctx.fillStyle = "#e8d09c";
  ctx.fillText(name, x, y + 13);
}
