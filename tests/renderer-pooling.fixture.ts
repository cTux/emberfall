import type { PixelComparison } from './renderer-fixture';

export function comparePooling(compare: PixelComparison) {
  // Shrinking/reordering a retained display list must not leave ghost sprites
  // or a previous frame's clip attached to a reused graphic.
  compare(
    'clipped red',
    (ctx) => {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(10, 10);
      ctx.lineTo(30, 10);
      ctx.lineTo(30, 30);
      ctx.lineTo(10, 30);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, 80, 80);
      ctx.restore();
    },
    15,
    15,
  );
  compare(
    'released clip',
    (ctx) => {
      ctx.fillStyle = '#00ff00';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(80, 0);
      ctx.lineTo(80, 80);
      ctx.lineTo(0, 80);
      ctx.closePath();
      ctx.fill();
    },
    50,
    50,
  );
  compare('removed visuals', () => {}, 15, 15);
  compare(
    'transformed sprite',
    (ctx) => {
      ctx.translate(110, 100);
      ctx.rotate(0.3);
      ctx.scale(-2, 1.5);
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(-10, -10, 20, 20);
    },
    110,
    100,
  );
  compare(
    'reset pooled transform',
    (ctx) => {
      ctx.fillStyle = '#0000ff';
      ctx.fillRect(10, 10, 30, 30);
    },
    20,
    20,
  );
}
