import type { DrawingContext } from './rendering/drawing-context';
import { environmentArt } from './art';

// Preserve the native 128-pixel torch cell and the lantern crop/pivot in that source artwork.
const TORCH_ART = {
  cell: 128,
  sourceY: 256,
  width: 42,
  height: 64,
  lampX: 69,
  lampY: 28,
  lampWidth: 27,
  lampHeight: 46,
  pivotX: 82,
  pivotY: 28,
  lampAnchorX: -13,
};
// Existing two-frequency sway, candle flicker and four embers retain the approved lantern motion.
const TORCH_MOTION = {
  swayMs: 1500,
  swayRadians: 0.065,
  gustMs: 3700,
  gustRadians: 0.02,
  flickerAlpha: 0.08,
  flickerMs: 113,
  flickerAmplitude: 0.035,
  bloom: 3,
  embers: 4,
  emberOffsetMs: 450,
  emberLifetimeMs: 1800,
  emberAlpha: 0.45,
  emberAngle: 2.4,
  emberSpread: 5,
  emberY: 25,
  emberRise: 24,
};

let hangingLamp: { post: HTMLCanvasElement; lamp: HTMLCanvasElement } | undefined;

/** Split the existing painting once: one fixed post and one suspended lantern. */
export function drawTorchFire(
  ctx: DrawingContext,
  x: number,
  y: number,
  now: number,
  particles: boolean,
  bloom: boolean,
  width = TORCH_ART.width,
  height = TORCH_ART.height,
) {
  if (!environmentArt.naturalWidth) {
    return;
  }

  if (!hangingLamp) {
    const post = document.createElement('canvas');
    post.width = post.height = TORCH_ART.cell;
    const paint = post.getContext('2d')!;
    const resolution = Number(environmentArt.dataset.artResolution ?? 1);
    paint.drawImage(
      environmentArt,
      0,
      TORCH_ART.sourceY * resolution,
      TORCH_ART.cell * resolution,
      TORCH_ART.cell * resolution,
      0,
      0,
      128,
      128,
    );
    const lamp = document.createElement('canvas');
    lamp.width = TORCH_ART.lampWidth;
    lamp.height = TORCH_ART.lampHeight;
    lamp
      .getContext('2d')!
      .drawImage(
        post,
        TORCH_ART.lampX,
        TORCH_ART.lampY,
        TORCH_ART.lampWidth,
        TORCH_ART.lampHeight,
        0,
        0,
        TORCH_ART.lampWidth,
        TORCH_ART.lampHeight,
      );
    paint.clearRect(TORCH_ART.lampX, TORCH_ART.lampY, TORCH_ART.lampWidth, TORCH_ART.lampHeight);
    hangingLamp = { post, lamp };
  }

  ctx.save();
  ctx.translate(x - width / 2, y - height);
  ctx.scale(width / TORCH_ART.cell, height / TORCH_ART.cell);
  ctx.drawImage(hangingLamp.post, 0, 0);
  ctx.translate(TORCH_ART.pivotX, TORCH_ART.pivotY);
  // Time-only phase stays continuous when projected coordinates wrap.
  ctx.rotate(
    Math.sin(now / TORCH_MOTION.swayMs) * TORCH_MOTION.swayRadians +
      Math.sin(now / TORCH_MOTION.gustMs) * TORCH_MOTION.gustRadians,
  );
  ctx.drawImage(hangingLamp.lamp, TORCH_ART.lampAnchorX, 0);
  const opacity = ctx.globalAlpha;
  ctx.globalAlpha =
    opacity *
    (TORCH_MOTION.flickerAlpha +
      Math.sin(now / TORCH_MOTION.flickerMs) * TORCH_MOTION.flickerAmplitude);
  ctx.fillStyle = '#ffd477';
  ctx.fillRect(-3, 26, 6, 10);

  if (particles) {
    if (bloom) {
      ctx.shadowBlur = TORCH_MOTION.bloom;
      ctx.shadowColor = '#ff8b32';
    }

    for (let i = 0; i < TORCH_MOTION.embers; i++) {
      const age =
        ((now + i * TORCH_MOTION.emberOffsetMs) % TORCH_MOTION.emberLifetimeMs) /
        TORCH_MOTION.emberLifetimeMs;
      ctx.globalAlpha = opacity * Math.sin(age * Math.PI) * TORCH_MOTION.emberAlpha;
      ctx.fillRect(
        Math.sin(i * TORCH_MOTION.emberAngle + age) * TORCH_MOTION.emberSpread,
        TORCH_MOTION.emberY - age * TORCH_MOTION.emberRise,
        1,
        1,
      );
    }
  }

  ctx.restore();
}
