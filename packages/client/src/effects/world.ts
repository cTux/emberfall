import { WIND, FIREFLIES, VIGNETTE, LIGHT_SHAFTS } from './world-style.ts';
import type { DrawingContext } from '../rendering/drawing-context';

export function vegetationSway(
  x: number,
  y: number,
  width: number,
  height: number,
  now: number,
  grass = false,
) {
  const phase = x * WIND.xPhase + y * WIND.yPhase;

  return (
    (Math.sin(now / WIND.primaryPeriodMs + phase) +
      Math.sin(now / WIND.secondaryPeriodMs + phase * WIND.secondaryPhase) * WIND.secondaryWeight) *
    (width / height) *
    (grass ? WIND.grassShear : WIND.foliageShear)
  );
}

export function drawVegetation(
  ctx: DrawingContext,
  sprite: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
  now: number,
  waving: boolean,
) {
  if (waving) {
    const sway = vegetationSway(x, y, width, height, now, sprite.width === WIND.grassSpritePixels);
    ctx.save();
    // Shear around the base: roots stay fixed while foliage catches the breeze.
    ctx.transform(1, 0, sway, 1, -sway * y, 0);
    ctx.drawImage(sprite, x - width / 2, y - height, width, height);
    ctx.restore();
  } else {
    ctx.drawImage(sprite, x - width / 2, y - height, width, height);
  }
}

export function drawParticles(
  ctx: DrawingContext,
  x: number,
  y: number,
  width: number,
  height: number,
  now: number,
) {
  ctx.save();
  ctx.fillStyle = '#eed389';

  for (
    let row = Math.floor((y - FIREFLIES.cullMargin) / FIREFLIES.cellSize);
    row <= Math.ceil((y + height + FIREFLIES.cullMargin) / FIREFLIES.cellSize);
    row++
  ) {
    for (
      let col = Math.floor((x - FIREFLIES.cullMargin) / FIREFLIES.cellSize);
      col <= Math.ceil((x + width + FIREFLIES.cullMargin) / FIREFLIES.cellSize);
      col++
    ) {
      const seed =
        (((col % FIREFLIES.seedColumns) + FIREFLIES.seedColumns) % FIREFLIES.seedColumns) *
          FIREFLIES.columnSeed +
        (((row % FIREFLIES.seedRows) + FIREFLIES.seedRows) % FIREFLIES.seedRows) *
          FIREFLIES.rowSeed;
      ctx.globalAlpha =
        FIREFLIES.opacity +
        Math.sin(now / FIREFLIES.flickerPeriodMs + seed) * FIREFLIES.flickerRange;
      ctx.fillRect(
        col * FIREFLIES.cellSize +
          (seed % FIREFLIES.xScatter) +
          Math.sin(now / FIREFLIES.xPeriodMs + seed) * FIREFLIES.xDrift,
        row * FIREFLIES.cellSize +
          (seed % FIREFLIES.yScatter) +
          Math.cos(now / FIREFLIES.yPeriodMs + seed) * FIREFLIES.yDrift,
        2,
        2,
      );
    }
  }

  ctx.restore();
}

export function drawVignette(
  ctx: DrawingContext,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const radius = Math.max(width, height) * VIGNETTE.outerScale;
  const gradient = ctx.createRadialGradient(
    x + width / 2,
    y + height / 2,
    radius * VIGNETTE.clearRadiusScale,
    x + width / 2,
    y + height / 2,
    radius,
  );
  gradient.addColorStop(0, '#08131000');
  gradient.addColorStop(1, '#081310aa');
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);
}

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
