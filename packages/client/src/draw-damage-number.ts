import { damageTextFrame } from './damage-text-frame.ts';
import { CRITICAL_TEXT_STYLE } from './critical-text-style.ts';
import { DAMAGE_COLORS } from './damage-colors.ts';
import { DAMAGE_TEXT } from './damage-text-tuning.ts';
import type { DrawingContext } from './rendering/drawing-context';
import type { DamageEvent } from '@emberfall/core/contracts';

// Existing combat-label calibration gives each number a fixed 750 ms flight and short initial pop.

/** Both combat areas render the same authoritative damage metadata. */
export function drawDamageNumber(
  ctx: DrawingContext,
  hit: DamageEvent,
  point: { x: number; y: number },
  now: number,
) {
  const frame = damageTextFrame(hit, now);

  if (!frame || hit.amount <= 0) {
    return;
  }

  ctx.save();
  ctx.globalAlpha *= frame.alpha;
  ctx.translate(point.x + frame.x, point.y + frame.y);
  ctx.scale(frame.scale, frame.scale);
  ctx.font = hit.critical
    ? 'bold 22px "Alegreya Sans", sans-serif'
    : 'bold 16px "Alegreya Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = hit.critical
    ? CRITICAL_TEXT_STYLE.fill
    : hit.target.startsWith('enemy:')
      ? DAMAGE_COLORS[hit.damageType ?? 'physical']
      : '#ff8b81';
  const value = String(Math.max(1, Math.round(hit.amount)));
  ctx.strokeStyle = '#20150f';
  ctx.lineWidth = hit.critical ? DAMAGE_TEXT.criticalStroke : DAMAGE_TEXT.normalStroke;
  ctx.lineJoin = 'round';
  ctx.strokeText(value, 0, 0);

  if (hit.critical) {
    ctx.strokeStyle = CRITICAL_TEXT_STYLE.outline;
    ctx.lineWidth = CRITICAL_TEXT_STYLE.width;
    ctx.strokeText(value, 0, 0);
  }

  ctx.fillText(value, 0, 0);
  ctx.restore();
}
