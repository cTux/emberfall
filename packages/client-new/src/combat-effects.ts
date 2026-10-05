import { TRANSIENT_EFFECTS } from "@emberfall/common-new/definitions/effects/transient";
import { statusImages } from "./combat-assets";
import { effectsArt, pickupArt, drawArt } from "./art";
import type { SceneState, LootDrop, Enemy, DamageEvent } from "@emberfall/common-new";

export function bloodPuddleRenderer() {
  const puddles = new Map<number, Pick<DamageEvent, "id" | "x" | "y" | "at">>();
  let sceneId: string | undefined;
  return (
    ctx: CanvasRenderingContext2D,
    scene: SceneState | undefined,
    now: number,
    enabled: boolean,
    near: (x: number, y: number) => { x: number; y: number },
    view: { x: number; y: number; width: number; height: number },
  ) => {
    if (scene?.id !== sceneId) {
      puddles.clear();
      sceneId = scene?.id;
    }
    for (const hit of scene?.damage ?? [])
      if (
        hit.killed &&
        hit.target.startsWith("enemy:") &&
        now - hit.at < TRANSIENT_EFFECTS.blood.lifetimeMs &&
        !puddles.has(hit.id)
      )
        puddles.set(hit.id, { id: hit.id, x: hit.x, y: hit.y, at: hit.at });
    for (const puddle of puddles.values())
      if (now - puddle.at >= TRANSIENT_EFFECTS.blood.lifetimeMs) puddles.delete(puddle.id);
    if (!enabled) return;
    ctx.save();
    ctx.fillStyle = "#8c1728";
    for (const puddle of puddles.values()) {
      ctx.globalAlpha =
        0.5 * (1 - Math.max(0, now - puddle.at) / TRANSIENT_EFFECTS.blood.lifetimeMs);
      const p = near(puddle.x, puddle.y + 15);
      if (
        p.x < view.x - 40 ||
        p.x > view.x + view.width + 40 ||
        p.y < view.y - 20 ||
        p.y > view.y + view.height + 20
      )
        continue;
      // Seed each stain so its uneven outline and droplets stay fixed between frames.
      let seed = puddle.id;
      const random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      // One fill keeps overlapping splash shapes at the same fading opacity.
      ctx.beginPath();
      for (let i = 0; i < 24; i++) {
        const angle = (i / 24) * Math.PI * 2 + puddle.id;
        const radius = 9 + random() * 19;
        const x = p.x + Math.cos(angle) * radius;
        const y = p.y + Math.sin(angle) * radius * 0.55;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      for (let i = 0; i < 10; i++) {
        const angle = random() * Math.PI * 2;
        const distance = 24 + random() * 13;
        const radius = 1 + random() * 2.5;
        const x = p.x + Math.cos(angle) * distance;
        const y = p.y + Math.sin(angle) * distance * 0.55;
        ctx.moveTo(x + radius, y);
        ctx.ellipse(x, y, radius, radius * 0.55, 0, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    ctx.restore();
  };
}

const lootSprites = new Map<LootDrop["kind"], HTMLCanvasElement>();
function lootSprite(kind: LootDrop["kind"]) {
  let sprite = lootSprites.get(kind);
  if (sprite) return sprite;
  sprite = document.createElement("canvas");
  sprite.width = sprite.height = 40;
  const ctx = sprite.getContext("2d")!;
  const glow = ctx.createRadialGradient(20, 20, 1, 20, 20, 18);
  glow.addColorStop(0, kind === "gold" ? "#ffca5599" : "#68ffc399");
  glow.addColorStop(1, "#0000");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 40, 40);
  ctx.fillStyle = kind === "gold" ? "#ffc74e" : "#72ffd0";
  ctx.beginPath();
  ctx.ellipse(20, 20, kind === "gold" ? 4 : 3.5, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = kind === "gold" ? "#fff0a5" : "#e7fff8";
  ctx.fillRect(18, 17, 2, 3);
  if (kind === "gold") {
    ctx.strokeStyle = "#ad7420";
    ctx.strokeRect(19, 18, 2, 5);
  }
  lootSprites.set(kind, sprite);
  return sprite;
}

export function drawLootAndBlood(
  ctx: CanvasRenderingContext2D,
  scene: SceneState,
  now: number,
  near: (x: number, y: number) => { x: number; y: number },
  view: { x: number; y: number; width: number; height: number },
) {
  const visible = (p: { x: number; y: number }) =>
    p.x >= view.x - 40 &&
    p.x <= view.x + view.width + 40 &&
    p.y >= view.y - 40 &&
    p.y <= view.y + view.height + 40;
  ctx.save();
  for (const drop of scene.drops ?? []) {
    const p = near(drop.x, drop.y + 15);
    if (!visible(p)) continue;
    const age = Math.max(0, now - drop.at);
    const jump = Math.abs(Math.sin(age / 190 + drop.id * 0.7)) * (4 + 7 * Math.exp(-age / 650));
    ctx.fillStyle = "#06181080";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 2, 5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    if (pickupArt.naturalWidth)
      drawArt(
        ctx,
        pickupArt,
        Math.floor((now + drop.id * 70) / 170) % 4,
        drop.kind === "gold" ? 1 : 2,
        p.x - 10,
        p.y - 16 - jump,
        20,
        20,
      );
    else ctx.drawImage(lootSprite(drop.kind), p.x - 20, p.y - 24 - jump);
  }
  // Bound bursts independently of ambient-particle settings, so hits remain readable on Low.
  for (const hit of scene.damage.slice(-80)) {
    const age = (now - hit.at) / 1000;
    if (age < 0 || age > 0.6) continue;
    const p = near(hit.x, hit.y);
    if (!visible(p)) continue;
    ctx.globalAlpha = 1 - age / 0.6;
    for (let i = 0; i < 12; i++) {
      const angle = i * 2.399963 + hit.id;
      const speed = 20 + ((i * 13) % 43);
      ctx.fillStyle = i % 3 ? "#bd283b" : "#f45561";
      ctx.fillRect(
        p.x + Math.cos(angle) * speed * age,
        p.y - 5 + Math.sin(angle) * speed * age - 30 * age + 65 * age * age,
        i % 3 ? 2 : 3,
        2,
      );
    }
  }
  ctx.restore();
}

export function drawClassProjectiles(
  ctx: CanvasRenderingContext2D,
  scene: SceneState,
  now: number,
  near: (x: number, y: number) => { x: number; y: number },
) {
  ctx.save();
  for (const shot of scene.playerShots ?? []) {
    const p = near(shot.x, shot.y);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(shot.angle);
    if (shot.kind === "roots") ctx.scale(0.5, 0.5);
    if (shot.kind === "arrow" && pickupArt.naturalWidth) {
      drawArt(ctx, pickupArt, Math.floor(now / 100) % 4, 0, -22, -22, 44, 44);
    } else if (shot.kind === "arrow") {
      ctx.strokeStyle = "#92d89c";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-22, 0);
      ctx.lineTo(9, 0);
      ctx.stroke();
      ctx.fillStyle = "#edffe7";
      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.lineTo(5, -4);
      ctx.lineTo(5, 4);
      ctx.closePath();
      ctx.fill();
    } else if (effectsArt.naturalWidth) {
      drawArt(
        ctx,
        effectsArt,
        Math.floor(now / 100) % 3,
        shot.kind === "roots" ? 3 : 2,
        -24,
        -24,
        48,
        48,
        128,
      );
    } else {
      ctx.fillStyle = shot.kind === "roots" ? "#56bc7277" : "#ef722977";
      ctx.beginPath();
      ctx.ellipse(-8, 0, 20, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shot.kind === "roots" ? "#79db87" : "#ff9d36";
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shot.kind === "roots" ? "#d5ffd0" : "#fff1a6";
      ctx.beginPath();
      ctx.arc(2, -1, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  for (const explosion of scene.explosions ?? []) {
    const age = Math.max(0, (now - explosion.at) / 350);
    if (age >= 1) continue;
    const p = near(explosion.x, explosion.y);
    ctx.globalAlpha = 1 - age;
    ctx.fillStyle = "#ffb53d44";
    ctx.strokeStyle = "#ffcb6b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 100 * (0.3 + age * 0.7), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

export function drawDebuffs(
  ctx: CanvasRenderingContext2D,
  enemy: Enemy,
  x: number,
  y: number,
  now: number,
) {
  const debuffs = enemy.debuffs?.filter((d) => d.expiresAt > now) ?? [];
  ctx.save();
  ctx.font = 'bold 8px "Alegreya Sans", sans-serif';
  ctx.textAlign = "right";
  ctx.lineJoin = "round";
  ctx.lineWidth = 2;
  ctx.imageSmoothingEnabled = false;
  debuffs.forEach((debuff, index) => {
    const px = x + index * 14;
    const image = statusImages[debuff.kind];
    if (image.naturalWidth) ctx.drawImage(image, px, y - 12, 12, 12);
    ctx.strokeStyle = "#101817";
    ctx.strokeText(String(debuff.stacks), px + 11, y - 1);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(String(debuff.stacks), px + 11, y - 1);
  });
  ctx.restore();
}
