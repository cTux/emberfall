import { combineDamageNumbers } from './combine-damage-numbers.ts';
import { drawDamageNumber } from './draw-damage-number.ts';
import type { DrawingContext } from './rendering/drawing-context';
import type { DamageEvent } from '@emberfall/core/contracts';

// Existing combat-label calibration gives each number a fixed 750 ms flight and short initial pop.

export function drawDamageNumbers(
  ctx: DrawingContext,
  hits: readonly DamageEvent[],
  project: (x: number, y: number) => { x: number; y: number },
  now: number,
  onlyPlayerId?: string,
) {
  for (const hit of combineDamageNumbers(hits)) {
    if (onlyPlayerId && hit.ownerId !== onlyPlayerId && hit.target !== onlyPlayerId) {
      continue;
    }

    drawDamageNumber(ctx, hit, project(hit.x, hit.y), now);
  }
}
