import type { DrawingContext } from './rendering/drawing-context';
import type { Player } from '@emberfall/common';
import { characterStats, defaultSpellRange, PLAYER_ATTACK_DURATION } from '@emberfall/core';
import { drawPlayerHealth } from './effects';

export function drawPlayerDetails(
  ctx: DrawingContext,
  p: Player,
  x: number,
  y: number,
  showVitals = true,
) {
  if (showVitals) {
    drawPlayerHealth(ctx, x, y - 46, p.hitpoints, p.maxHitpoints, p.name);
  }

  if (p.reconnecting) {
    ctx.save();
    ctx.font = 'bold 10px "Alegreya Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff5555';
    ctx.strokeStyle = '#101817';
    ctx.lineWidth = 3;
    ctx.strokeText('Reconnecting', x, y - 62);
    ctx.fillText('Reconnecting', x, y - 62);
    ctx.restore();

    return;
  }
}

export function drawPlayerAttack(
  ctx: DrawingContext,
  p: Player,
  x: number,
  y: number,
  now: number,
  bloom: boolean,
  inCombat: boolean,
  opacity = 1,
) {
  if (opacity === 0) {
    return;
  }

  if (p.reconnecting) {
    return;
  }

  const age = now - (p.attackAt ?? -Infinity);
  if (!characterStats(p).hasWeapon) {
    return;
  }

  const attackRange = defaultSpellRange(p);
  const attacking = inCombat && age >= 0 && age < PLAYER_ATTACK_DURATION;
  // Class weapons are painted into the directional action frames.
  if (attacking && p.hitpoints > 0) {
    if (p.classId === 'ranger' || p.classId === 'mage' || p.classId === 'druid') {
      return;
    }

    const progress = age / PLAYER_ATTACK_DURATION,
      angle = (p.attackAngle ?? 0) - Math.PI / 2 + progress * Math.PI;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(x, y);
    ctx.rotate(angle);
    if (bloom) {
      ctx.shadowColor = '#c3edff';
      ctx.shadowBlur = 10;
    }

    ctx.strokeStyle = `rgba(195,237,255,${1 - progress * 0.7})`;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(0, attackRange - 5), -0.65, 0);
    ctx.stroke();
    ctx.fillStyle = '#a8ffce';
    for (let i = 0; i < 10; i++) {
      ctx.globalAlpha = opacity * (1 - progress) * (1 - i / 14);
      ctx.fillRect(30 + i * 5 + progress * 12, Math.sin(i * 2.4) * (4 + progress * 24), 2, 2);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
