import type { DamageEvent, DamageType } from "@emberfall/common-new";

export const DAMAGE_COLORS: Record<DamageType, string> = {
  physical: "#fff0b1",
  fire: "#ff9d48",
  poison: "#c6e85a",
  nature: "#61dba3",
};
export const CRITICAL_TEXT_STYLE = { fill: "#ffffff", outline: "#d52b3f", width: 4 };

/** Fixed windows prevent a rapid stream of hits from extending a number forever. */
export function combineDamageNumbers(hits: readonly DamageEvent[]): DamageEvent[] {
  const totals: DamageEvent[] = [];
  const latest = new Map<string, DamageEvent>();
  for (const hit of [...hits].sort((a, b) => a.at - b.at)) {
    const key = JSON.stringify([hit.ownerId, hit.target, hit.damageType ?? "physical"]);
    const previous = hit.ownerId ? latest.get(key) : undefined;
    if (previous && hit.at - previous.at <= 10) {
      previous.amount += hit.amount;
      previous.critical = previous.critical || hit.critical;
    } else {
      const total = { ...hit };
      totals.push(total);
      if (hit.ownerId) latest.set(key, total);
    }
  }
  return totals;
}

export function drawDamageNumbers(
  ctx: CanvasRenderingContext2D,
  hits: readonly DamageEvent[],
  project: (x: number, y: number) => { x: number; y: number },
  now: number,
) {
  for (const hit of combineDamageNumbers(hits))
    drawDamageNumber(ctx, hit, project(hit.x, hit.y), now);
}
/** Both combat areas render the same authoritative damage metadata. */
export function drawDamageNumber(
  ctx: CanvasRenderingContext2D,
  hit: DamageEvent,
  point: { x: number; y: number },
  now: number,
) {
  const age = now - hit.at;
  if (age < 0 || age > 750) return;
  ctx.save();
  ctx.globalAlpha = 1 - age / 800;
  ctx.font = 'bold 14px "Alegreya Sans", sans-serif';
  ctx.textAlign = "center";
  ctx.fillStyle = hit.critical
    ? CRITICAL_TEXT_STYLE.fill
    : hit.target.startsWith("enemy:")
      ? DAMAGE_COLORS[hit.damageType ?? "physical"]
      : "#ff8b81";
  const value = String(Math.round(hit.amount));
  const y = point.y - 45 - age / 30;
  if (hit.critical) {
    ctx.strokeStyle = CRITICAL_TEXT_STYLE.outline;
    ctx.lineWidth = CRITICAL_TEXT_STYLE.width;
    ctx.lineJoin = "round";
    ctx.strokeText(value, point.x, y);
  }
  ctx.fillText(value, point.x, y);
  ctx.restore();
}
