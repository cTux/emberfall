import { FOREST, wrappedDelta } from "@emberfall/common-new";
import type { AddLabel } from "./WorldLabels";
import type { WorldState } from "@emberfall/common-new";

export function edgeArrow(x: number, y: number, width: number, height: number) {
  if (x >= 0 && x <= width && y >= 0 && y <= height) return null;
  const dx = x - width / 2,
    dy = y - height / 2;
  const ratio = Math.min((width / 2 - 28) / Math.abs(dx), (height / 2 - 28) / Math.abs(dy));
  return { x: width / 2 + dx * ratio, y: height / 2 + dy * ratio, angle: Math.atan2(dy, dx) };
}

export function collectNavigation(
  ctx: CanvasRenderingContext2D,
  world: WorldState,
  id: string,
  add: AddLabel,
) {
  const me = world.players.find((p) => p.id === id);
  if (!me) return;
  const targets = world.players
    .filter((p) => p.id !== id && p.scene === me.scene && p.hitpoints > 0)
    .map((p) => ({
      id: p.id,
      x: p.x,
      y: p.y,
      name: p.name,
      tone: "party" as "party" | "boss" | "portal",
    }));
  if (me.scene === "forest") {
    const boss = world.scene?.enemies.find((e) => e.kind === "boss" && e.hitpoints > 0);
    if (boss)
      targets.push({
        id: `boss:${boss.id}`,
        x: boss.x,
        y: boss.y,
        name: boss.name ?? "The Hollow Warden",
        tone: "boss",
      });
    if (world.scene?.phase === "ended")
      for (const portal of world.scene.portals)
        targets.push({
          ...portal,
          id: `portal:${portal.x}:${portal.y}`,
          name: "Return portal",
          tone: "portal",
        });
  }
  const matrix = ctx.getTransform();
  const width = ctx.canvas.clientWidth,
    height = ctx.canvas.clientHeight;
  const sx = ctx.canvas.width / width,
    sy = ctx.canvas.height / height;
  for (const target of targets) {
    const x = me.x + wrappedDelta(target.x, me.x, FOREST.width);
    const y = me.y + wrappedDelta(target.y, me.y, FOREST.height);
    const point = new DOMPoint(x, y).matrixTransform(matrix);
    const arrow = edgeArrow(point.x / sx, point.y / sy, width, height);
    if (!arrow) continue;
    add({
      id: `navigation:${target.id}`,
      kind: "navigation",
      text: target.name,
      tone: target.tone,
      x: arrow.x,
      y: arrow.y,
      angle: arrow.angle,
    });
  }
}

export function projectLabel(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const p = new DOMPoint(x, y).matrixTransform(ctx.getTransform());
  return {
    x: (p.x * ctx.canvas.clientWidth) / ctx.canvas.width,
    y: (p.y * ctx.canvas.clientHeight) / ctx.canvas.height,
  };
}
