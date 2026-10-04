import type { DamageEvent, DamageType } from "@emberfall/common-new";

export const DAMAGE_COLORS: Record<DamageType, string> = {
  physical: "#fff0b1",
  fire: "#ff9d48",
  poison: "#c6e85a",
  nature: "#61dba3",
};
export const CRITICAL_TEXT_STYLE = { fill: "#ffffff", outline: "#d52b3f", width: 4 };
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
