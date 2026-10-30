import type { DrawingContext } from '../rendering/drawing-context';
import type { SceneState, DamageEvent } from '@emberfall/common';
import { TRANSIENT_EFFECTS } from '@emberfall/core/definitions/effects/transient';

export function bloodPuddleRenderer() {
  const puddles = new Map<number, Pick<DamageEvent, 'id' | 'x' | 'y' | 'at'>>();
  let sceneId: string | undefined;
  return (
    ctx: DrawingContext,
    scene: SceneState | undefined,
    now: number,
    enabled: boolean,
    near: (x: number, y: number) => { x: number; y: number },
    view: { x: number; y: number; width: number; height: number },
  ) => {
    if (scene?.id !== sceneId) {
      puddles.clear();
      sceneId = scene?.id;
    }
    for (const hit of scene?.damage ?? [])
      if (
        hit.killed &&
        hit.target.startsWith('enemy:') &&
        now - hit.at < TRANSIENT_EFFECTS.blood.lifetimeMs &&
        !puddles.has(hit.id)
      )
        puddles.set(hit.id, { id: hit.id, x: hit.x, y: hit.y, at: hit.at });
    for (const puddle of puddles.values())
      if (now - puddle.at >= TRANSIENT_EFFECTS.blood.lifetimeMs) puddles.delete(puddle.id);
    if (!enabled) return;
    ctx.save();
    ctx.fillStyle = '#8c1728';
    for (const puddle of puddles.values()) {
      ctx.globalAlpha =
        0.5 * (1 - Math.max(0, now - puddle.at) / TRANSIENT_EFFECTS.blood.lifetimeMs);
      const p = near(puddle.x, puddle.y + 15);
      if (
        p.x < view.x - 40 ||
        p.x > view.x + view.width + 40 ||
        p.y < view.y - 20 ||
        p.y > view.y + view.height + 20
      )
        continue;
      // Seed each stain so its uneven outline and droplets stay fixed between frames.
      let seed = puddle.id;
      const random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      // One fill keeps overlapping splash shapes at the same fading opacity.
      ctx.beginPath();
      for (let i = 0; i < 24; i++) {
        const angle = (i / 24) * Math.PI * 2 + puddle.id;
        const radius = 9 + random() * 19;
        const x = p.x + Math.cos(angle) * radius;
        const y = p.y + Math.sin(angle) * radius * 0.55;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      for (let i = 0; i < 10; i++) {
        const angle = random() * Math.PI * 2;
        const distance = 24 + random() * 13;
        const radius = 1 + random() * 2.5;
        const x = p.x + Math.cos(angle) * distance;
        const y = p.y + Math.sin(angle) * distance * 0.55;
        ctx.moveTo(x + radius, y);
        ctx.ellipse(x, y, radius, radius * 0.55, 0, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    ctx.restore();
  };
}
