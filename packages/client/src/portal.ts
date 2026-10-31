import type { DrawingContext } from './rendering/drawing-context';
import type { Interaction } from './effects';
import type { InteractionTarget } from './interaction-targets';
import { INTERACTION_RADIUS } from '@emberfall/core';
import { portalArt, drawStonePortal } from './ambient-art';
import { castShadow, spriteMask, makeMask } from './lighting';
import { drawInteractionOutline } from './interaction-targets';
import { drawNameBadge } from './effects';

const portalSilhouette = document.createElement('canvas');
portalSilhouette.width = 50;
portalSilhouette.height = 76;
const portalContext = portalSilhouette.getContext('2d')!;
portalContext.fillStyle = '#347fe0';
portalContext.beginPath();
portalContext.ellipse(25, 38, 25, 38, 0, 0, Math.PI * 2);
portalContext.fill();
const portalMask = makeMask(portalSilhouette);

export function portalInteraction(source: Interaction, x: number, y: number): InteractionTarget {
  const stone = !!portalArt.naturalWidth;

  return {
    source,
    x: x - (stone ? 32 : 25),
    y: y - (stone ? 72 : 68),
    width: stone ? 64 : 50,
    height: stone ? 80 : 76,
    mask: stone ? spriteMask(portalArt, 0, 0, false, 128, false, 128)! : portalMask,
    reach: source,
    radius: INTERACTION_RADIUS,
  };
}

export function drawPortal(
  ctx: DrawingContext,
  x: number,
  y: number,
  now: number,
  bloom: boolean,
  name: string | null,
  outline: InteractionTarget | null,
  shadows: boolean,
  _waving: boolean,
  opacity = 1,
) {
  if (portalArt.naturalWidth) {
    if (shadows) {
      castShadow(ctx, {
        id: 'portal',
        x,
        y: y + 8,
        width: 64,
        height: 80,
        mask: spriteMask(portalArt, 0, 0, false, 128, false, 128)!,
      });
    }

    ctx.save();
    ctx.globalAlpha = opacity;
    if (bloom) {
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#53c9ff';
    }

    drawStonePortal(ctx, x - 32, y - 72, 64, 80, now);
    ctx.restore();
    if (outline) {
      drawInteractionOutline(ctx, outline);
    }

    if (name) {
      drawNameBadge(ctx, x, y - 72, name);
    }

    return;
  }

  if (shadows) {
    castShadow(ctx, { id: 'portal', x, y: y + 8, width: 50, height: 76, mask: portalMask });
  }

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(x, y);
  ctx.lineWidth = 4;
  if (!shadows) {
    ctx.fillStyle = '#162e4d';
    ctx.beginPath();
    ctx.ellipse(0, 1, 31, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  if (bloom) {
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#53c9ff';
  }

  ctx.fillStyle = '#101e68';
  ctx.beginPath();
  ctx.ellipse(0, -30, 25, 38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.shadowBlur = 0;
  const colors = ['#101e68', '#182c86', '#2042a6', '#285ac5', '#347fe0', '#52b4f5', '#8cddff'];
  const time = now / 1600;
  for (let py = -68; py < 8; py += 3) {
    for (let px = -25; px < 25; px += 3) {
      const u = px / 12,
        v = (py + 30) / 12;
      const ripple = Math.sin(u * 2 + Math.sin(v * 1.7 - time) * 2 + Math.sin(u + v + time * 0.6));
      const brightness = (ripple + Math.sin(v * 2 - time + Math.sin(u + time))) / 2;
      ctx.fillStyle = colors[Math.floor(((brightness + 1) / 2) * (colors.length - 1))];
      ctx.fillRect(px, py, 3, 3);
    }
  }

  ctx.restore();
  ctx.strokeStyle = '#8cddff';
  ctx.lineWidth = 2;
  ctx.stroke();
  for (let i = 0; i < 24; i++) {
    const age = ((now + i * 137) % 1800) / 1800,
      angle = i * 2.399963;
    ctx.globalAlpha = Math.sin(age * Math.PI) * 0.8;
    ctx.fillStyle = i % 3 === 0 ? '#b3efff' : '#52b4f5';
    ctx.fillRect(
      Math.round(Math.cos(angle) * (18 + age * 28)),
      Math.round(-30 + Math.sin(angle) * 28 - age * 35),
      2,
      2,
    );
  }

  ctx.restore();
  ctx.restore();
  if (outline) {
    drawInteractionOutline(ctx, outline);
  }

  if (name) {
    drawNameBadge(ctx, x, y - 60, name);
  }
}
