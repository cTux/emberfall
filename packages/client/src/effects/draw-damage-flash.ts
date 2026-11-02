import { HIT_STYLE } from './hit-style.ts';
import type { DrawingContext } from '../rendering/drawing-context';
import type { WorldState } from '@emberfall/common';

// Existing flash timings keep damage visible briefly without obscuring the next attack.

export function drawDamageFlash(ctx: DrawingContext, world: WorldState | null, id: string) {
  const hit = world?.scene?.damage
    .filter((d) => {
      return d.target === id;
    })
    .at(-1);
  const age = (world?.serverNow ?? 0) - (hit?.at ?? HIT_STYLE.missingHitAt);

  if (age < 0 || age > HIT_STYLE.screenDurationMs) {
    return;
  }

  ctx.save();
  ctx.resetTransform();
  ctx.globalAlpha *= HIT_STYLE.screenOpacity * (1 - age / HIT_STYLE.screenDurationMs);
  ctx.fillStyle = '#ff1923';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}
