import type { DrawingContext } from './rendering/drawing-context';
import { bearArt as image } from './art';
import { PLAYER_ATTACK_DURATION } from '@emberfall/core';
import { BEAR_DEFINITION } from '@emberfall/core/definitions/entities/companions';
import { MILLISECONDS_PER_SECOND, type Bear } from '@emberfall/common';
import { drawPlayerHealth, drawTargetHit } from './effects';
import { spriteMask } from './lighting';

// Bear sheet rows/columns and display bounds preserve the packaged cub's existing foot anchor and scale.
const BEAR_ART = {
  fallenFrame: 7,
  windupFrame: 5,
  releaseFrame: 6,
  stepMs: 120,
  walkFrames: 4,
  baseSize: 48,
  columns: 4,
  cell: 64,
  footOffset: 15,
  shadowFootOffset: 3,
  width: 42.5,
  height: 40,
  deadOpacity: 0.3,
  healthOffset: 53,
  claws: 3,
  clawStroke: 3,
} as const;

function companionFrame(bear: Bear, now: number) {
  const age = now - (bear.attackAt ?? -Infinity);

  return {
    column:
      bear.hitpoints <= 0
        ? BEAR_ART.fallenFrame
        : age >= 0 && age < PLAYER_ATTACK_DURATION
          ? age < PLAYER_ATTACK_DURATION / 2
            ? BEAR_ART.windupFrame
            : BEAR_ART.releaseFrame
          : bear.moving
            ? 1 + (Math.floor(now / BEAR_ART.stepMs) % BEAR_ART.walkFrames)
            : 0,
    left: Math.cos(bear.attackAngle ?? 0) < 0,
  };
}

export function companionCaster(bear: Bear, x: number, y: number, now: number, id: string) {
  if (bear.hitpoints <= 0) {
    return null;
  }

  const { column, left } = companionFrame(bear, now);
  const scale = (bear.size ?? BEAR_ART.baseSize) / BEAR_ART.baseSize;
  const mask = spriteMask(
    image,
    column % BEAR_ART.columns,
    Math.floor(column / BEAR_ART.columns),
    left,
    BEAR_ART.cell,
    false,
    BEAR_ART.cell,
  );

  return mask
    ? {
        id,
        x,
        y: y + BEAR_ART.footOffset + BEAR_ART.shadowFootOffset * scale,
        width: BEAR_ART.width * scale,
        height: BEAR_ART.height * scale,
        mask,
      }
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
  const scale = (bear.size ?? BEAR_ART.baseSize) / BEAR_ART.baseSize;
  ctx.translate(x, y + BEAR_ART.footOffset);
  ctx.scale(scale, scale);
  ctx.translate(-x, -y - BEAR_ART.footOffset);

  if (!shadows) {
    ctx.fillStyle = '#06181080';
    ctx.beginPath();
    ctx.ellipse(x, y + BEAR_ART.footOffset, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const angle = bear.attackAngle ?? 0;
  const { column, left } = companionFrame(bear, now);
  const dead = bear.hitpoints <= 0;
  ctx.globalAlpha = opacity * (dead ? BEAR_ART.deadOpacity : 1);

  if (image.naturalWidth) {
    ctx.save();
    ctx.translate(x, y);

    if (left) {
      ctx.scale(-1, 1);
    }

    ctx.drawImage(
      image,
      (column % BEAR_ART.columns) * 64,
      Math.floor(column / BEAR_ART.columns) * 64,
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
      spriteMask(
        image,
        column % BEAR_ART.columns,
        Math.floor(column / BEAR_ART.columns),
        left,
        BEAR_ART.cell,
        false,
        BEAR_ART.cell,
      )!,
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
    y + BEAR_ART.footOffset - BEAR_ART.healthOffset * scale,
    bear.hitpoints,
    bear.maxHitpoints,
    dead
      ? `Bear · ${Math.max(0, Math.ceil(((bear.resurrectAt ?? now) - now) / MILLISECONDS_PER_SECOND))}s`
      : 'Bear',
    undefined,
    false,
    showHealth,
  );
  const age = now - (bear.attackAt ?? -Infinity);

  if (!dead && !bear.returning && age >= 0 && age < PLAYER_ATTACK_DURATION) {
    ctx.translate(x, y);
    ctx.rotate(angle - Math.PI / 2 + (age / PLAYER_ATTACK_DURATION) * Math.PI);
    ctx.strokeStyle = `rgba(255,235,196,${1 - age / PLAYER_ATTACK_DURATION})`;
    ctx.lineWidth = BEAR_ART.clawStroke;

    for (let i = 0; i < BEAR_ART.claws; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, (bear.range ?? BEAR_DEFINITION.range) - 5 - i * 7, -0.65, 0);
      ctx.stroke();
    }
  }

  ctx.restore();
}
