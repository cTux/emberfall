import { worldHitboxes } from './world-hitboxes.ts';
import type { DrawingContext } from './rendering/drawing-context';
import type { WorldState } from '@emberfall/core/contracts';
import { wrappedDelta } from '@emberfall/core/geometry';
import { FOREST, ARENA } from '@emberfall/core';
import { HITBOX_PRESENTATION } from './hitbox-calibration.ts';

/** Called after atmosphere/occlusion, using the same world transform as sprites. */
export function drawHitboxes(
  ctx: DrawingContext,
  world: WorldState,
  forest: boolean,
  view: { x: number; y: number; width: number; height: number },
) {
  const size = forest ? FOREST : ARENA;
  const cx = view.x + view.width / 2,
    cy = view.y + view.height / 2;
  let drawn = 0;
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.lineWidth = HITBOX_PRESENTATION.outlineWidth;
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';

  for (const shape of worldHitboxes(world, forest, view)) {
    const width = 'radius' in shape ? shape.radius * 2 : shape.width;
    const height = 'radius' in shape ? shape.radius * 2 : shape.height;
    const x = cx + wrappedDelta(shape.x + ('radius' in shape ? 0 : width / 2), cx, size.width);
    const y = cy + wrappedDelta(shape.y + ('radius' in shape ? 0 : height / 2), cy, size.height);

    if (
      x + width / 2 < view.x ||
      x - width / 2 > view.x + view.width ||
      y + height / 2 < view.y ||
      y - height / 2 > view.y + view.height
    ) {
      continue;
    }

    ctx.strokeStyle = shape.color;
    ctx.beginPath();

    if ('radius' in shape) {
      if (shape.angle !== undefined) {
        ctx.moveTo(x, y);
        ctx.arc(x, y, shape.radius, shape.angle - Math.PI / 2, shape.angle + Math.PI / 2);
        ctx.closePath();
      } else {
        ctx.arc(x, y, shape.radius, 0, Math.PI * 2);
      }

      ctx.stroke();
    } else {
      ctx.strokeRect(x - width / 2, y - height / 2, width, height);
    }

    if (shape.label) {
      ctx.fillStyle = shape.color;
      ctx.fillText(shape.label, x, y - height / 2 - 3);
    }

    drawn++;
  }

  ctx.restore();

  return drawn;
}
