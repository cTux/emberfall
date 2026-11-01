import type { DrawingContext } from './rendering/drawing-context';
import type { Player } from '@emberfall/common';
import { characterStats, defaultSpellRange, PLAYER_ATTACK_DURATION } from '@emberfall/core';
import { drawPlayerHealth } from './effects';

// Preserve the world-scale status anchors above the 48-unit actor, with an outlined reconnect label.
const PLAYER_LABEL = { healthY: 46, reconnectY: 62, outline: 3 };
// Retain the approved warrior slash arc and ten fading motes; values control presentation, never hit detection.
const SLASH_ART = {
  bloom: 10,
  alphaFalloff: 0.7,
  stroke: 9,
  radiusInset: 5,
  startAngle: -0.65,
  particles: 10,
  fadeDivisor: 14,
  startX: 30,
  spacing: 5,
  travel: 12,
  angle: 2.4,
  spread: 4,
  expansion: 24,
};

export function drawPlayerDetails(
  ctx: DrawingContext,
  p: Player,
  x: number,
  y: number,
  showVitals = true,
) {
  if (showVitals) {
    drawPlayerHealth(ctx, x, y - PLAYER_LABEL.healthY, p.hitpoints, p.maxHitpoints, p.name);
  }

  if (p.reconnecting) {
    ctx.save();
    ctx.font = 'bold 10px "Alegreya Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff5555';
    ctx.strokeStyle = '#101817';
    ctx.lineWidth = PLAYER_LABEL.outline;
    ctx.strokeText('Reconnecting', x, y - PLAYER_LABEL.reconnectY);
    ctx.fillText('Reconnecting', x, y - PLAYER_LABEL.reconnectY);
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
      ctx.shadowBlur = SLASH_ART.bloom;
    }

    ctx.strokeStyle = `rgba(195,237,255,${1 - progress * SLASH_ART.alphaFalloff})`;
    ctx.lineWidth = SLASH_ART.stroke;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(0, attackRange - SLASH_ART.radiusInset), SLASH_ART.startAngle, 0);
    ctx.stroke();
    ctx.fillStyle = '#a8ffce';

    for (let i = 0; i < SLASH_ART.particles; i++) {
      ctx.globalAlpha = opacity * (1 - progress) * (1 - i / SLASH_ART.fadeDivisor);
      ctx.fillRect(
        SLASH_ART.startX + i * SLASH_ART.spacing + progress * SLASH_ART.travel,
        Math.sin(i * SLASH_ART.angle) * (SLASH_ART.spread + progress * SLASH_ART.expansion),
        2,
        2,
      );
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
