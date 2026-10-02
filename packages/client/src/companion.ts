import { PLAYER_ATTACK_DURATION, PLAYER_ATTACK_RANGE } from "@emberfall/common";
import type { Bear } from "@emberfall/common";
import { drawPlayerHealth } from "./effects";
import { spriteMask } from "./lighting";
import { drawReflection } from "./reflections";

const image = new Image();
image.src = "/assets/companion-boar.png";

function companionFrame(bear: Bear, now: number) {
  return {
    column: bear.hitpoints <= 0 || !bear.moving ? 0 : Math.floor(now / 120) % 2,
    left: Math.cos(bear.attackAngle ?? 0) < 0,
  };
}
export function companionCaster(bear: Bear, x: number, y: number, now: number, id: string) {
  if (bear.hitpoints <= 0) return null;
  const { column, left } = companionFrame(bear, now);
  const mask = spriteMask(image, column, 0, left, 17);
  return mask ? { id, x, y: y + 18, width: 42.5, height: 40, mask } : null;
}

export function drawCompanion(
  ctx: CanvasRenderingContext2D,
  bear: Bear,
  x: number,
  y: number,
  now: number,
  shadows = false,
  reflections = false,
) {
  ctx.save();
  if (!shadows) {
    ctx.fillStyle = "#06181080";
    ctx.beginPath();
    ctx.ellipse(x, y + 15, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const angle = bear.attackAngle ?? 0;
  const { column, left } = companionFrame(bear, now);
  const dead = bear.hitpoints <= 0;
  ctx.globalAlpha = dead ? 0.3 : 1;
  if (image.naturalWidth) {
    if (reflections)
      drawReflection(ctx, image, x, y + 18, 42.5, 40, [column * 17, 0, 17, 16], left);
    ctx.save();
    ctx.translate(x, y);
    if (left) ctx.scale(-1, 1);
    ctx.drawImage(image, column * 17, 0, 17, 16, -21.25, -22, 42.5, 40);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  drawPlayerHealth(
    ctx,
    x,
    y - 38,
    bear.hitpoints,
    bear.maxHitpoints,
    dead ? `Boar · ${Math.max(0, Math.ceil(((bear.resurrectAt ?? now) - now) / 1000))}s` : "Boar",
  );
  const age = now - (bear.attackAt ?? -Infinity);
  if (!dead && !bear.returning && age >= 0 && age < PLAYER_ATTACK_DURATION) {
    ctx.translate(x, y);
    ctx.rotate(angle - Math.PI / 2 + (age / PLAYER_ATTACK_DURATION) * Math.PI);
    ctx.strokeStyle = `rgba(255,235,196,${1 - age / PLAYER_ATTACK_DURATION})`;
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, PLAYER_ATTACK_RANGE - 5 - i * 7, -0.65, 0);
      ctx.stroke();
    }
  }
  ctx.restore();
}
