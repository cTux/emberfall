import { PLAYER_ATTACK_RANGE, PLAYER_ATTACK_DURATION } from "@emberfall/common";
import type { SceneState, Player } from "@emberfall/common";

/** The sword hits a forward semicircle, so its ground marker shows that exact footprint. */
export function drawPlayerRange(
  ctx: CanvasRenderingContext2D,
  player: Player,
  x: number,
  y: number,
  now: number,
) {
  if (player.classId && player.classId !== "warrior") return;
  const angle = player.attackAngle ?? 0;
  const age = now - (player.attackAt ?? -Infinity);
  const pulse = age >= 0 && age < PLAYER_ATTACK_DURATION ? 1 - age / PLAYER_ATTACK_DURATION : 0;
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#52ed87";
  ctx.fillStyle = `rgba(52, 220, 112, ${0.03 + pulse * 0.07})`;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, PLAYER_ATTACK_RANGE, angle - Math.PI / 2, angle + Math.PI / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** Gameplay warnings deliberately remain visible at every graphics preset. */
export function drawDanger(
  ctx: CanvasRenderingContext2D,
  scene: SceneState,
  now: number,
  near: (x: number, y: number) => { x: number; y: number },
  projectilesOnly = false,
) {
  ctx.save();
  const zone = (x: number, y: number, radius: number, progress: number, spawn = false) => {
    const p = near(x, y + 15);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ff344c";
    ctx.fillStyle = "#ff18352b";
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = spawn ? "#ff344c70" : "#ff18358c";
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius * Math.sqrt(Math.max(0, Math.min(1, progress))), 0, Math.PI * 2);
    ctx.fill();
    if (!spawn && progress > 0.65) {
      ctx.fillStyle = "#ff8790";
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4 + progress * 2;
        ctx.fillRect(
          p.x + Math.cos(angle) * radius * progress,
          p.y + Math.sin(angle) * radius * progress,
          2,
          2,
        );
      }
    }
    if (spawn) {
      ctx.beginPath();
      ctx.moveTo(p.x - 6, p.y - 6);
      ctx.lineTo(p.x + 6, p.y + 6);
      ctx.moveTo(p.x + 6, p.y - 6);
      ctx.lineTo(p.x - 6, p.y + 6);
      ctx.stroke();
    }
  };
  for (const spawn of projectilesOnly ? [] : (scene.spawns ?? []))
    zone(
      spawn.x,
      spawn.y,
      spawn.kind === "boss" ? 42 : 26,
      (now - spawn.warnedAt) / (spawn.spawnsAt - spawn.warnedAt),
      true,
    );
  for (const enemy of projectilesOnly ? [] : scene.enemies) {
    const attack = enemy.attack;
    if (!attack) continue;
    zone(
      attack.x,
      attack.y,
      attack.radius,
      (now - attack.startedAt) / (attack.endsAt - attack.startedAt),
    );
    if (attack.ranged) {
      const from = near(enemy.x, enemy.y + 15),
        to = near(attack.x, attack.y + 15);
      ctx.strokeStyle = "#ff344c";
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  for (const shot of projectilesOnly ? (scene.projectiles ?? []) : []) {
    const p = near(shot.x, shot.y + 15);
    ctx.strokeStyle = "#ff344c";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(p.x - shot.vx * 0.06, p.y - shot.vy * 0.06);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.fillStyle = "#ff1835";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe1d9";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
