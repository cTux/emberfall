import type { DrawingContext } from './rendering/drawing-context';
import { environmentArt } from './art';

let hangingLamp: { post: HTMLCanvasElement; lamp: HTMLCanvasElement } | undefined;

/** Split the existing painting once: one fixed post and one suspended lantern. */
export function drawTorchFire(
  ctx: DrawingContext,
  x: number,
  y: number,
  now: number,
  particles: boolean,
  bloom: boolean,
  width = 42,
  height = 64,
) {
  if (!environmentArt.naturalWidth) return;
  if (!hangingLamp) {
    const post = document.createElement('canvas');
    post.width = post.height = 128;
    const paint = post.getContext('2d')!;
    const resolution = Number(environmentArt.dataset.artResolution ?? 1);
    paint.drawImage(
      environmentArt,
      0,
      256 * resolution,
      128 * resolution,
      128 * resolution,
      0,
      0,
      128,
      128,
    );
    const lamp = document.createElement('canvas');
    lamp.width = 27;
    lamp.height = 46;
    lamp.getContext('2d')!.drawImage(post, 69, 28, 27, 46, 0, 0, 27, 46);
    paint.clearRect(69, 28, 27, 46);
    hangingLamp = { post, lamp };
  }
  ctx.save();
  ctx.translate(x - width / 2, y - height);
  ctx.scale(width / 128, height / 128);
  ctx.drawImage(hangingLamp.post, 0, 0);
  ctx.translate(82, 28);
  // Time-only phase stays continuous when projected coordinates wrap.
  ctx.rotate(Math.sin(now / 1500) * 0.065 + Math.sin(now / 3700) * 0.02);
  ctx.drawImage(hangingLamp.lamp, -13, 0);
  const opacity = ctx.globalAlpha;
  ctx.globalAlpha = opacity * (0.08 + Math.sin(now / 113) * 0.035);
  ctx.fillStyle = '#ffd477';
  ctx.fillRect(-3, 26, 6, 10);
  if (particles) {
    if (bloom) {
      ctx.shadowBlur = 3;
      ctx.shadowColor = '#ff8b32';
    }
    for (let i = 0; i < 4; i++) {
      const age = ((now + i * 450) % 1800) / 1800;
      ctx.globalAlpha = opacity * Math.sin(age * Math.PI) * 0.45;
      ctx.fillRect(Math.sin(i * 2.4 + age) * 5, 25 - age * 24, 1, 1);
    }
  }
  ctx.restore();
}
