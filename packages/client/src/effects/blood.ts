import { BLOOD_STYLE as STYLE, STAIN_RANDOM } from './blood-style.ts';
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

    for (const hit of scene?.damage ?? []) {
      if (
        hit.killed &&
        hit.target.startsWith('enemy:') &&
        now - hit.at < TRANSIENT_EFFECTS.blood.lifetimeMs &&
        !puddles.has(hit.id)
      ) {
        puddles.set(hit.id, { id: hit.id, x: hit.x, y: hit.y, at: hit.at });
      }
    }

    for (const puddle of puddles.values()) {
      if (now - puddle.at >= TRANSIENT_EFFECTS.blood.lifetimeMs) {
        puddles.delete(puddle.id);
      }
    }

    if (!enabled) {
      return;
    }

    ctx.save();
    ctx.fillStyle = '#8c1728';

    for (const puddle of puddles.values()) {
      ctx.globalAlpha =
        STYLE.opacity * (1 - Math.max(0, now - puddle.at) / TRANSIENT_EFFECTS.blood.lifetimeMs);
      const p = near(puddle.x, puddle.y + STYLE.feetOffset);

      if (
        p.x < view.x - STYLE.horizontalCullMargin ||
        p.x > view.x + view.width + STYLE.horizontalCullMargin ||
        p.y < view.y - STYLE.verticalCullMargin ||
        p.y > view.y + view.height + STYLE.verticalCullMargin
      ) {
        continue;
      }

      // Seed each stain so its uneven outline and droplets stay fixed between frames.
      let seed = puddle.id;
      const random = () => {
        seed = (Math.imul(seed, STAIN_RANDOM.multiplier) + STAIN_RANDOM.increment) >>> 0;

        return seed / STAIN_RANDOM.range;
      };

      // One fill keeps overlapping splash shapes at the same fading opacity.
      ctx.beginPath();

      for (let i = 0; i < STYLE.outlinePoints; i++) {
        const angle = (i / STYLE.outlinePoints) * Math.PI * 2 + puddle.id;
        const radius = STYLE.minimumRadius + random() * STYLE.radiusSpread;
        const x = p.x + Math.cos(angle) * radius;
        const y = p.y + Math.sin(angle) * radius * STYLE.groundFlattening;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.closePath();

      for (let i = 0; i < STYLE.droplets; i++) {
        const angle = random() * Math.PI * 2;
        const distance = STYLE.dropletDistance + random() * STYLE.dropletDistanceSpread;
        const radius = 1 + random() * STYLE.dropletRadiusSpread;
        const x = p.x + Math.cos(angle) * distance;
        const y = p.y + Math.sin(angle) * distance * STYLE.groundFlattening;
        ctx.moveTo(x + radius, y);
        ctx.ellipse(x, y, radius, radius * STYLE.groundFlattening, 0, 0, Math.PI * 2);
      }

      ctx.fill();
    }

    ctx.restore();
  };
}
