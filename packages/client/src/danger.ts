import type { DrawingContext } from './rendering/drawing-context';
import type { SceneState } from '@emberfall/common';

// Existing warning-art calibration aligns indicators with actor feet and emphasizes the final 35% of windup.
const WARNING = {
  footOffset: 15,
  lateProgress: 0.65,
  sparks: 8,
  angleDivisor: 4,
  bossRadius: 42,
  normalRadius: 26,
  trailSeconds: 0.06,
  projectileStroke: 5,
  zoneStroke: 2,
  dash: [5, 5],
} as const;

/** Gameplay warnings deliberately remain visible at every graphics preset. */
export function drawDanger(
  ctx: DrawingContext,
  scene: SceneState,
  now: number,
  near: (x: number, y: number) => { x: number; y: number },
  projectilesOnly = false,
) {
  ctx.save();
  const zone = (x: number, y: number, radius: number, progress: number, spawn = false) => {
    const p = near(x, y + WARNING.footOffset);
    ctx.lineWidth = WARNING.zoneStroke;
    ctx.strokeStyle = '#ff344c';
    ctx.fillStyle = '#ff18352b';
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = spawn ? '#ff344c70' : '#ff18358c';
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius * Math.sqrt(Math.max(0, Math.min(1, progress))), 0, Math.PI * 2);
    ctx.fill();

    if (!spawn && progress > WARNING.lateProgress) {
      ctx.fillStyle = '#ff8790';

      for (let i = 0; i < WARNING.sparks; i++) {
        const angle = (i * Math.PI) / WARNING.angleDivisor + progress * 2;
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

  for (const spawn of projectilesOnly ? [] : (scene.spawns ?? [])) {
    zone(
      spawn.x,
      spawn.y,
      spawn.kind === 'boss' ? WARNING.bossRadius : WARNING.normalRadius,
      (now - spawn.warnedAt) / (spawn.spawnsAt - spawn.warnedAt),
      true,
    );
  }

  for (const enemy of projectilesOnly ? [] : scene.enemies) {
    const attack = enemy.attack;

    if (!attack) {
      continue;
    }

    zone(
      attack.x,
      attack.y,
      attack.radius,
      (now - attack.startedAt) / (attack.endsAt - attack.startedAt),
    );

    if (attack.ranged) {
      const from = near(enemy.x, enemy.y + WARNING.footOffset),
        to = near(attack.x, attack.y + WARNING.footOffset);
      ctx.strokeStyle = '#ff344c';
      ctx.setLineDash(WARNING.dash);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  for (const shot of projectilesOnly ? (scene.projectiles ?? []) : []) {
    const p = near(shot.x, shot.y + WARNING.footOffset);
    ctx.strokeStyle = '#ff344c';
    ctx.lineWidth = WARNING.projectileStroke;
    ctx.beginPath();
    ctx.moveTo(p.x - shot.vx * WARNING.trailSeconds, p.y - shot.vy * WARNING.trailSeconds);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.fillStyle = '#ff1835';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe1d9';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
