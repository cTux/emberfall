import type { DrawingContext } from './rendering/drawing-context';
import type { DamageEvent, DamageType } from '@emberfall/common';

// Existing combat-label calibration gives each number a fixed 750 ms flight and short initial pop.
const DAMAGE_TEXT = {
  lifetimeMs: 750,
  lanes: 5,
  centerLane: 2,
  popMs: 80,
  initialScale: 0.8,
  popGrowth: 0.55,
  settleScale: 0.35,
  settleMs: 140,
  laneGap: 7,
  laneSpread: 12,
  rise: 42,
  fadeAtMs: 450,
  fadeMs: 300,
  mergeWindowMs: 10,
  criticalStroke: 7,
  normalStroke: 3,
} as const;

export const DAMAGE_COLORS: Record<DamageType, string> = {
  physical: '#fff0b1',
  fire: '#ff9d48',
  poison: '#c6e85a',
  nature: '#61dba3',
};
export const CRITICAL_TEXT_STYLE = { fill: '#ffffff', outline: '#d52b3f', width: 4 };

/** Stateless animation survives snapshot replacement without replaying a hit. */
export function damageTextFrame(hit: DamageEvent, now: number) {
  const age = now - hit.at;

  if (age < 0 || age >= DAMAGE_TEXT.lifetimeMs) {
    return undefined;
  }

  const progress = age / DAMAGE_TEXT.lifetimeMs;
  const rise = 1 - (1 - progress) ** 2;
  const lane =
    (((hit.id % DAMAGE_TEXT.lanes) + DAMAGE_TEXT.lanes) % DAMAGE_TEXT.lanes) -
    DAMAGE_TEXT.centerLane;
  const pop =
    age < DAMAGE_TEXT.popMs
      ? DAMAGE_TEXT.initialScale + (age / DAMAGE_TEXT.popMs) * DAMAGE_TEXT.popGrowth
      : 1 +
        DAMAGE_TEXT.settleScale * Math.max(0, 1 - (age - DAMAGE_TEXT.popMs) / DAMAGE_TEXT.settleMs);

  return {
    x: lane * (DAMAGE_TEXT.laneGap + rise * DAMAGE_TEXT.laneSpread),
    y: -DAMAGE_TEXT.rise - rise * DAMAGE_TEXT.rise,
    scale: pop,
    alpha: age <= DAMAGE_TEXT.fadeAtMs ? 1 : (DAMAGE_TEXT.lifetimeMs - age) / DAMAGE_TEXT.fadeMs,
  };
}

/** Fixed windows prevent a rapid stream of hits from extending a number forever. */
export function combineDamageNumbers(hits: readonly DamageEvent[]): DamageEvent[] {
  const totals: DamageEvent[] = [];
  const latest = new Map<string, DamageEvent>();

  for (const hit of [...hits].sort((a, b) => {
    return a.at - b.at;
  })) {
    const key = JSON.stringify([hit.ownerId, hit.target, hit.damageType ?? 'physical']);
    const previous = hit.ownerId ? latest.get(key) : undefined;

    if (previous && hit.at - previous.at <= DAMAGE_TEXT.mergeWindowMs) {
      previous.amount += hit.amount;
      previous.critical = previous.critical || hit.critical;
    } else {
      const total = { ...hit };
      totals.push(total);

      if (hit.ownerId) {
        latest.set(key, total);
      }
    }
  }

  return totals;
}

export function drawDamageNumbers(
  ctx: DrawingContext,
  hits: readonly DamageEvent[],
  project: (x: number, y: number) => { x: number; y: number },
  now: number,
  onlyPlayerId?: string,
) {
  for (const hit of combineDamageNumbers(hits)) {
    if (onlyPlayerId && hit.ownerId !== onlyPlayerId && hit.target !== onlyPlayerId) {
      continue;
    }

    drawDamageNumber(ctx, hit, project(hit.x, hit.y), now);
  }
}

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
