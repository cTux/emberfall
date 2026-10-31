import type { DrawingContext } from '../rendering/drawing-context';

export function vegetationSway(
  x: number,
  y: number,
  width: number,
  height: number,
  now: number,
  grass = false,
) {
  const phase = x * 0.013 + y * 0.017;

  return (
    (Math.sin(now / 1600 + phase) + Math.sin(now / 2700 + phase * 1.7) * 0.3) *
    (width / height) *
    (grass ? 0.07 : 0.018)
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
    const sway = vegetationSway(x, y, width, height, now, sprite.width === 16);
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

  for (let row = Math.floor((y - 40) / 160); row <= Math.ceil((y + height + 40) / 160); row++) {
    for (let col = Math.floor((x - 40) / 160); col <= Math.ceil((x + width + 40) / 160); col++) {
      const seed = (((col % 30) + 30) % 30) * 179 + (((row % 16) + 16) % 16) * 83;
      ctx.globalAlpha = 0.25 + Math.sin(now / 900 + seed) * 0.2;
      ctx.fillRect(
        col * 160 + (seed % 135) + Math.sin(now / 2400 + seed) * 18,
        row * 160 + (seed % 111) + Math.cos(now / 1900 + seed) * 25,
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
  const radius = Math.max(width, height) * 0.65;
  const gradient = ctx.createRadialGradient(
    x + width / 2,
    y + height / 2,
    radius * 0.25,
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
    const slope = 0.6;
    const beamWidth = 160;
    // Anchor parallel beams to the world, rather than restarting at the viewport top.
    const first = Math.floor((x - slope * (y + height) - beamWidth - 12) / 420);
    const last = Math.ceil((x + width - slope * y + 12) / 420);

    for (let col = first; col <= last; col++) {
      const base = col * 420 + Math.sin(now / 12000 + col) * 12 + slope * y;
      // Fade across the beam's perpendicular axis so both long edges are transparent.
      const cross = beamWidth / (1 + slope * slope);
      const gradient = ctx.createLinearGradient(base, y, base + cross, y - slope * cross);
      gradient.addColorStop(0, '#ffe6a800');
      gradient.addColorStop(0.2, '#ffe6a803');
      gradient.addColorStop(0.5, '#ffe6a80c');
      gradient.addColorStop(0.8, '#ffe6a803');
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
