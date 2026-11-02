import type { DrawingContext } from '../rendering/drawing-context';
import { LIGHT_SHAFTS } from './world-style.ts';

export function drawAtmosphere(
  ctx: DrawingContext,
  x: number,
  y: number,
  width: number,
  height: number,
  now: number,
  settings: { colorGrading: boolean; lightShafts: boolean },
  daylight = 1,
) {
  ctx.save();

  if (settings.colorGrading) {
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = '#bea26f25';
    ctx.fillRect(x, y, width, height);
  }

  if (settings.lightShafts) {
    ctx.globalAlpha *= daylight;
    ctx.globalCompositeOperation = 'screen';
    const slope = LIGHT_SHAFTS.slope;
    const beamWidth = LIGHT_SHAFTS.width;
    // Anchor parallel beams to the world, rather than restarting at the viewport top.
    const first = Math.floor(
      (x - slope * (y + height) - beamWidth - LIGHT_SHAFTS.drift) / LIGHT_SHAFTS.spacing,
    );
    const last = Math.ceil((x + width - slope * y + LIGHT_SHAFTS.drift) / LIGHT_SHAFTS.spacing);

    for (let col = first; col <= last; col++) {
      const base =
        col * LIGHT_SHAFTS.spacing +
        Math.sin(now / LIGHT_SHAFTS.periodMs + col) * LIGHT_SHAFTS.drift +
        slope * y;
      // Fade across the beam's perpendicular axis so both long edges are transparent.
      const cross = beamWidth / (1 + slope * slope);
      const gradient = ctx.createLinearGradient(base, y, base + cross, y - slope * cross);
      gradient.addColorStop(0, '#ffe6a800');
      gradient.addColorStop(LIGHT_SHAFTS.leadingFadeStop, '#ffe6a803');
      gradient.addColorStop(0.5, '#ffe6a80c');
      gradient.addColorStop(LIGHT_SHAFTS.trailingFadeStop, '#ffe6a803');
      gradient.addColorStop(1, '#ffe6a800');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(base, y);
      ctx.lineTo(base + beamWidth, y);
      ctx.lineTo(base + height * slope + beamWidth, y + height);
      ctx.lineTo(base + height * slope, y + height);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.restore();
}
