import type { DrawingContext } from './rendering/drawing-context';
import type { Player } from '@emberfall/core/contracts';
import { drawPlayerHealth } from './effects';

// Preserve the world-scale status anchors above the 48-unit actor, with an outlined reconnect label.

// Preserve the world-scale status anchors above the 48-unit actor, with an outlined reconnect label.
const PLAYER_LABEL = { healthY: 46, reconnectY: 62, outline: 3 };

export function drawPlayerDetails(
  ctx: DrawingContext,
  p: Player,
  x: number,
  y: number,
  showVitals = true,
) {
  if (showVitals) {
    drawPlayerHealth(ctx, x, y - PLAYER_LABEL.healthY, p.hitpoints, p.maxHitpoints, p.name);
  }

  if (p.reconnecting) {
    ctx.save();
    ctx.font = 'bold 10px "Alegreya Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff5555';
    ctx.strokeStyle = '#101817';
    ctx.lineWidth = PLAYER_LABEL.outline;
    ctx.strokeText('Reconnecting', x, y - PLAYER_LABEL.reconnectY);
    ctx.fillText('Reconnecting', x, y - PLAYER_LABEL.reconnectY);
    ctx.restore();

    return;
  }
}
