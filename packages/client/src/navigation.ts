import { FOREST, wrappedDelta } from "@emberfall/common";
import type { WorldState } from "@emberfall/common";

export function edgeArrow(x: number, y: number, width: number, height: number) {
  if (x >= 0 && x <= width && y >= 0 && y <= height) return null;
  const dx = x - width / 2,
    dy = y - height / 2;
  const ratio = Math.min((width / 2 - 28) / Math.abs(dx), (height / 2 - 28) / Math.abs(dy));
  return { x: width / 2 + dx * ratio, y: height / 2 + dy * ratio, angle: Math.atan2(dy, dx) };
}

export function drawNavigation(ctx: CanvasRenderingContext2D, world: WorldState, id: string) {
  const me = world.players.find((p) => p.id === id);
  if (!me) return;
  const targets = world.players
    .filter((p) => p.id !== id && p.scene === me.scene && p.hitpoints > 0)
    .map((p) => ({ x: p.x, y: p.y, name: p.name, color: "#89e5c5" }));
  if (me.scene === "forest") {
    const boss = world.scene?.enemies.find((e) => e.kind === "boss" && e.hitpoints > 0);
    if (boss)
      targets.push({
        x: boss.x,
        y: boss.y,
        name: boss.name ?? "The Hollow Warden",
        color: "#ffae58",
      });
    if (world.scene?.phase === "ended")
      for (const portal of world.scene.portals)
        targets.push({ ...portal, name: "Return portal", color: "#70d8ff" });
  }
  const matrix = ctx.getTransform();
  const width = ctx.canvas.clientWidth,
    height = ctx.canvas.clientHeight;
  const sx = ctx.canvas.width / width,
    sy = ctx.canvas.height / height;
  ctx.save();
  ctx.setTransform(sx, 0, 0, sy, 0, 0);
  for (const target of targets) {
    const x = me.scene === "forest" ? me.x + wrappedDelta(target.x, me.x, FOREST.width) : target.x;
    const y = me.scene === "forest" ? me.y + wrappedDelta(target.y, me.y, FOREST.height) : target.y;
    const point = new DOMPoint(x, y).matrixTransform(matrix);
    const arrow = edgeArrow(point.x / sx, point.y / sy, width, height);
    if (!arrow) continue;
    ctx.save();
    ctx.translate(arrow.x, arrow.y);
    ctx.rotate(arrow.angle);
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-7, -7);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-7, 7);
    ctx.closePath();
    ctx.fillStyle = target.color;
    ctx.strokeStyle = "#101817";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fill();
    ctx.restore();
    ctx.font = 'bold 11px "Pixelify Sans", sans-serif';
    ctx.textAlign = "center";
    const label = target.name.length > 20 ? target.name.slice(0, 19) + "…" : target.name;
    const box = ctx.measureText(label).width + 12;
    const lx = Math.max(
      box / 2 + 5,
      Math.min(width - box / 2 - 5, arrow.x - Math.cos(arrow.angle) * 30),
    );
    const ly = Math.max(20, Math.min(height - 10, arrow.y - Math.sin(arrow.angle) * 28));
    ctx.fillStyle = "#101817dd";
    ctx.fillRect(lx - box / 2, ly - 12, box, 17);
    ctx.fillStyle = target.color;
    ctx.fillText(label, lx, ly);
  }
  ctx.restore();
}
