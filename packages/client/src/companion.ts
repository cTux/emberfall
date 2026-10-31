import type { DrawingContext } from './rendering/drawing-context';
import { bearArt as image } from './art';
import { PLAYER_ATTACK_DURATION } from '@emberfall/core';
import { BEAR_DEFINITION } from '@emberfall/core/definitions/entities/companions';
import type { Bear } from '@emberfall/common';
import { drawPlayerHealth, drawTargetHit } from './effects';
import { spriteMask } from './lighting';

function companionFrame(bear: Bear, now: number) {
  const age = now - (bear.attackAt ?? -Infinity);

  return {
    column:
      bear.hitpoints <= 0
        ? 7
        : age >= 0 && age < PLAYER_ATTACK_DURATION
          ? age < PLAYER_ATTACK_DURATION / 2
            ? 5
            : 6
          : bear.moving
            ? 1 + (Math.floor(now / 120) % 4)
            : 0,
    left: Math.cos(bear.attackAngle ?? 0) < 0,
  };
}

export function companionCaster(bear: Bear, x: number, y: number, now: number, id: string) {
  if (bear.hitpoints <= 0) {
    return null;
  }

  const { column, left } = companionFrame(bear, now);
  const scale = (bear.size ?? 48) / 48;
  const mask = spriteMask(image, column % 4, Math.floor(column / 4), left, 64, false, 64);

  return mask
    ? { id, x, y: y + 15 + 3 * scale, width: 42.5 * scale, height: 40 * scale, mask }
    : null;
}

export function drawCompanion(
  ctx: DrawingContext,
  bear: Bear,
  x: number,
  y: number,
  now: number,
  shadows = false,
  opacity = 1,
  showHealth = true,
) {
  ctx.save();
  const scale = (bear.size ?? 48) / 48;
  ctx.translate(x, y + 15);
  ctx.scale(scale, scale);
  ctx.translate(-x, -y - 15);
  if (!shadows) {
    ctx.fillStyle = '#06181080';
    ctx.beginPath();
    ctx.ellipse(x, y + 15, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const angle = bear.attackAngle ?? 0;
  const { column, left } = companionFrame(bear, now);
  const dead = bear.hitpoints <= 0;
  ctx.globalAlpha = opacity * (dead ? 0.3 : 1);
  if (image.naturalWidth) {
    ctx.save();
    ctx.translate(x, y);
    if (left) {
      ctx.scale(-1, 1);
    }

    ctx.drawImage(
      image,
      (column % 4) * 64,
      Math.floor(column / 4) * 64,
      64,
      64,
      -21.25,
      -22,
      42.5,
      40,
    );
    ctx.restore();
    drawTargetHit(
      ctx,
      spriteMask(image, column % 4, Math.floor(column / 4), left, 64, false, 64)!,
      x - 21.25,
      y - 22,
      42.5,
      40,
      now - (bear.hurtAt ?? -Infinity),
    );
  }

  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 1;
  drawPlayerHealth(
    ctx,
    x,
    y + 15 - 53 * scale,
    bear.hitpoints,
    bear.maxHitpoints,
    dead ? `Bear · ${Math.max(0, Math.ceil(((bear.resurrectAt ?? now) - now) / 1000))}s` : 'Bear',
    undefined,
    false,
    showHealth,
  );
  const age = now - (bear.attackAt ?? -Infinity);
  if (!dead && !bear.returning && age >= 0 && age < PLAYER_ATTACK_DURATION) {
    ctx.translate(x, y);
    ctx.rotate(angle - Math.PI / 2 + (age / PLAYER_ATTACK_DURATION) * Math.PI);
    ctx.strokeStyle = `rgba(255,235,196,${1 - age / PLAYER_ATTACK_DURATION})`;
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, (bear.range ?? BEAR_DEFINITION.range) - 5 - i * 7, -0.65, 0);
      ctx.stroke();
    }
  }

  ctx.restore();
}
