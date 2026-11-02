import { BEAR_ART } from './bear-art.ts';
import { companionFrame } from './companion-frame.ts';
import type { DrawingContext } from './rendering/drawing-context';
import { type Bear, MILLISECONDS_PER_SECOND } from '@emberfall/core/contracts';
import { bearArt as image } from './art';
import { drawTargetHit, drawPlayerHealth } from './effects';
import { spriteMask } from './lighting';

// Bear sheet rows/columns and display bounds preserve the packaged cub's existing foot anchor and scale.
import { PLAYER_ATTACK_DURATION } from '@emberfall/core';
import { BEAR_DEFINITION } from '@emberfall/core/definitions/entities/companions';

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
