import type { DrawingContext } from './rendering/drawing-context';
import type { Interaction } from './effects';
import type { InteractionTarget } from './interaction-targets';
import { INTERACTION_RADIUS } from '@emberfall/core';
import { portalArt, drawStonePortal } from './ambient-art';
import { castShadow, spriteMask, makeMask } from './lighting';
import { drawInteractionOutline } from './interaction-targets';
import { drawNameBadge } from './effects';

// Native stone portals occupy 64×80 world units; the fallback ellipse retains its original 50×76 silhouette.
const PORTAL_ART = {
  stoneWidth: 64,
  stoneHeight: 80,
  stoneOffsetX: 32,
  stoneOffsetY: 72,
  fallbackWidth: 50,
  fallbackHeight: 76,
  fallbackOffsetX: 25,
  fallbackOffsetY: 68,
  atlasCell: 128,
  shadowOffset: 8,
  stoneBloom: 12,
  outlineWidth: 4,
  fallbackBloom: 20,
  outlineStroke: 2,
  labelOffset: 60,
};
// Preserve the approved ripple texture and golden-angle particle distribution; this is visual calibration only.
const PORTAL_EFFECT = {
  phaseMs: 1600,
  top: -68,
  bottom: 8,
  left: -25,
  right: 25,
  cell: 3,
  rippleScale: 12,
  rippleOffset: 30,
  waveRate: 1.7,
  secondaryRate: 0.6,
  particles: 24,
  particleOffsetMs: 137,
  particleLifetimeMs: 1800,
  goldenAngle: 2.399963,
  alpha: 0.8,
  brightEvery: 3,
  innerRadius: 18,
  expansion: 28,
  centerY: -30,
  orbitHeight: 28,
  rise: 35,
};

const portalSilhouette = document.createElement('canvas');
portalSilhouette.width = PORTAL_ART.fallbackWidth;
portalSilhouette.height = PORTAL_ART.fallbackHeight;
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
    x: x - (stone ? PORTAL_ART.stoneOffsetX : PORTAL_ART.fallbackOffsetX),
    y: y - (stone ? PORTAL_ART.stoneOffsetY : PORTAL_ART.fallbackOffsetY),
    width: stone ? PORTAL_ART.stoneWidth : PORTAL_ART.fallbackWidth,
    height: stone ? PORTAL_ART.stoneHeight : PORTAL_ART.fallbackHeight,
    mask: stone
      ? spriteMask(portalArt, 0, 0, false, PORTAL_ART.atlasCell, false, PORTAL_ART.atlasCell)!
      : portalMask,
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
        y: y + PORTAL_ART.shadowOffset,
        width: 64,
        height: 80,
        mask: spriteMask(
          portalArt,
          0,
          0,
          false,
          PORTAL_ART.atlasCell,
          false,
          PORTAL_ART.atlasCell,
        )!,
      });
    }

    ctx.save();
    ctx.globalAlpha = opacity;

    if (bloom) {
      ctx.shadowBlur = PORTAL_ART.stoneBloom;
      ctx.shadowColor = '#53c9ff';
    }

    drawStonePortal(
      ctx,
      x - PORTAL_ART.stoneOffsetX,
      y - PORTAL_ART.stoneOffsetY,
      PORTAL_ART.stoneWidth,
      PORTAL_ART.stoneHeight,
      now,
    );
    ctx.restore();

    if (outline) {
      drawInteractionOutline(ctx, outline);
    }

    if (name) {
      drawNameBadge(ctx, x, y - PORTAL_ART.stoneOffsetY, name);
    }

    return;
  }

  if (shadows) {
    castShadow(ctx, {
      id: 'portal',
      x,
      y: y + PORTAL_ART.shadowOffset,
      width: 50,
      height: 76,
      mask: portalMask,
    });
  }

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(x, y);
  ctx.lineWidth = PORTAL_ART.outlineWidth;

  if (!shadows) {
    ctx.fillStyle = '#162e4d';
    ctx.beginPath();
    ctx.ellipse(0, 1, 31, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();

  if (bloom) {
    ctx.shadowBlur = PORTAL_ART.fallbackBloom;
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
  const time = now / PORTAL_EFFECT.phaseMs;

  for (let py = PORTAL_EFFECT.top; py < PORTAL_EFFECT.bottom; py += PORTAL_EFFECT.cell) {
    for (let px = PORTAL_EFFECT.left; px < PORTAL_EFFECT.right; px += PORTAL_EFFECT.cell) {
      const u = px / PORTAL_EFFECT.rippleScale,
        v = (py + PORTAL_EFFECT.rippleOffset) / PORTAL_EFFECT.rippleScale;
      const ripple = Math.sin(
        u * 2 +
          Math.sin(v * PORTAL_EFFECT.waveRate - time) * 2 +
          Math.sin(u + v + time * PORTAL_EFFECT.secondaryRate),
      );
      const brightness = (ripple + Math.sin(v * 2 - time + Math.sin(u + time))) / 2;
      ctx.fillStyle = colors[Math.floor(((brightness + 1) / 2) * (colors.length - 1))];
      ctx.fillRect(px, py, 3, 3);
    }
  }

  ctx.restore();
  ctx.strokeStyle = '#8cddff';
  ctx.lineWidth = PORTAL_ART.outlineStroke;
  ctx.stroke();

  for (let i = 0; i < PORTAL_EFFECT.particles; i++) {
    const age =
        ((now + i * PORTAL_EFFECT.particleOffsetMs) % PORTAL_EFFECT.particleLifetimeMs) /
        PORTAL_EFFECT.particleLifetimeMs,
      angle = i * PORTAL_EFFECT.goldenAngle;
    ctx.globalAlpha = Math.sin(age * Math.PI) * PORTAL_EFFECT.alpha;
    ctx.fillStyle = i % PORTAL_EFFECT.brightEvery === 0 ? '#b3efff' : '#52b4f5';
    ctx.fillRect(
      Math.round(Math.cos(angle) * (PORTAL_EFFECT.innerRadius + age * PORTAL_EFFECT.expansion)),
      Math.round(
        PORTAL_EFFECT.centerY +
          Math.sin(angle) * PORTAL_EFFECT.orbitHeight -
          age * PORTAL_EFFECT.rise,
      ),
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
    drawNameBadge(ctx, x, y - PORTAL_ART.labelOffset, name);
  }
}
