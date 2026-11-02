import type { WorldDrawingContext } from './rendering/drawing-context';
import { type Caster, castShadow } from './lighting';

/** Match forest scenery's baked fallback shadows when projected shadows are disabled. */
export function drawForestShadows(
  ctx: WorldDrawingContext,
  casters: readonly Caster[],
  trees: readonly { x: number; y: number }[],
  enabled: boolean,
) {
  if (enabled) {
    for (const caster of casters) {
      castShadow(ctx, caster);
    }
  }

  if (!enabled) {
    ctx.fillStyle = '#07120955';

    for (const t of trees) {
      ctx.beginPath();
      ctx.ellipse(t.x, t.y, 23, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
