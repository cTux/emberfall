import { PLAYER_ATTACK_DURATION, PLAYER_ATTACK_RANGE } from "@emberfall/common";
import type { Bear } from "@emberfall/common";
import { movementFacing } from "./facing";
import { drawPlayerHealth, drawNameBadge } from "./effects";

const image = new Image();
image.src = "/assets/bear.png";

export function drawCompanion(
  ctx: CanvasRenderingContext2D,
  bear: Bear,
  x: number,
  y: number,
  now: number,
) {
  ctx.save();
  ctx.fillStyle = "#06181080";
  ctx.beginPath();
  ctx.ellipse(x, y + 15, 20, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  const angle = bear.attackAngle ?? 0;
  const facing = movementFacing(Math.cos(angle), Math.sin(angle), 0);
  const dead = bear.hitpoints <= 0;
  ctx.globalAlpha = dead ? 0.3 : 1;
  if (image.naturalWidth)
    ctx.drawImage(
      image,
      facing * 16,
      (dead ? 0 : Math.floor(now / 120) % 4) * 16,
      16,
      16,
      x - 28,
      y - 38,
      56,
      56,
    );
  ctx.globalAlpha = 1;
  drawNameBadge(
    ctx,
    x,
    y - 58,
    dead
      ? `Bear · ${Math.max(0, Math.ceil(((bear.resurrectAt ?? now) - now) / 1000))}s`
      : bear.name,
    false,
  );
  drawPlayerHealth(ctx, x, y - 39, bear.hitpoints, bear.maxHitpoints);
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
