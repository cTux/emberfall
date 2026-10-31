import {
  drawVignette,
  drawAtmosphere,
  drawInteractionPrompt,
  drawPlayerHealth,
} from '../packages/client/src/effects';
import { drawResourceHealth } from '../packages/client/src/gathering';
import { drawTimedActivity } from '../packages/client/src/timed-activity';
import { drawDebuffs } from '../packages/client/src/combat-effects';

import { drawFog } from '../packages/client/src/forest';

import type { PixelComparison } from './renderer-fixture';

export function compareSurfaces(
  compare: PixelComparison,
  canvas: CanvasRenderingContext2D,
  stackLabels: Record<string, string[]>,
) {
  compare('vignette center', (ctx) => drawVignette(ctx, 0, 0, 256, 256), 128, 128);
  const health = (ctx: CanvasRenderingContext2D) => drawPlayerHealth(ctx, 100, 93, 50, 100, 'Hero');
  compare('health border top', health, 90, 93);
  compare('health fill top', health, 90, 94);
  compare('health fill bottom', health, 90, 98);
  compare('health border bottom', health, 82, 99);
  compare('health empty track', health, 110, 94);
  compare('health outside frame', health, 90, 92);
  compare(
    'tree health border',
    (ctx) =>
      drawResourceHealth(
        ctx,
        { id: 'tree', kind: 'tree', x: 100, y: 140, size: 36 },
        { remaining: 3, restoresAt: 5000 },
      ),
    90,
    93,
  );
  compare(
    'gathering border',
    (ctx) =>
      drawTimedActivity(
        ctx,
        {
          startedAt: 0,
          endsAt: 5000,
          durationMs: 5000,
          zoneStart: 0.7,
          zoneAt: 0,
          checkId: 'zone',
        },
        100,
        91,
        2500,
      ),
    90,
    93,
  );
  const prompt = (ctx: CanvasRenderingContext2D) => {
    ctx.scale(4, 4);
    drawInteractionPrompt(ctx, 32, 48, '');
  };
  compare('prompt rounded corner', prompt, 81, 69);
  compare('prompt face highlight', prompt, 101, 89);
  compare('prompt face shade', prompt, 123, 111);
  compare('prompt rim left', prompt, 89, 100);
  compare('prompt rim right', prompt, 134, 100);
  compare('prompt rim top', prompt, 112, 77);
  compare('prompt rim bottom', prompt, 112, 122);
  compare('fog blending', (ctx) => drawFog(ctx, 0, 0, 256, 256, 1000), 128, 128);
  compare('vignette edge', (ctx) => drawVignette(ctx, 0, 0, 256, 256), 5, 128);
  compare(
    'translated vignette',
    (ctx) => {
      ctx.translate(-500, -200);
      drawVignette(ctx, 500, 200, 256, 256);
    },
    128,
    128,
  );
  compare(
    'color grading',
    (ctx) => drawAtmosphere(ctx, 0, 0, 256, 256, 0, { colorGrading: true, lightShafts: false }),
    128,
    128,
  );
  compare(
    'light shafts',
    (ctx) => drawAtmosphere(ctx, 0, 0, 256, 256, 0, { colorGrading: false, lightShafts: true }),
    10,
    5,
  );
  for (const [name, x] of [
    ['shaft left feather', 62],
    ['shaft center', 140],
    ['shaft right feather', 218],
  ] as const)
    compare(
      name,
      (ctx) => drawAtmosphere(ctx, 0, 0, 256, 256, 0, { colorGrading: false, lightShafts: true }),
      x,
      100,
    );
  compare(
    'shaft after camera move',
    (ctx) => {
      ctx.translate(-50, -70);
      drawAtmosphere(ctx, 50, 70, 256, 256, 0, { colorGrading: false, lightShafts: true });
    },
    90,
    30,
  );
  for (const shade of ['#101817', '#b4cfdc']) {
    compare(
      `grading ${shade}`,
      (ctx) => {
        ctx.fillStyle = shade;
        ctx.fillRect(0, 0, 256, 256);
        drawAtmosphere(ctx, 0, 0, 256, 256, 0, { colorGrading: true, lightShafts: false });
      },
      128,
      128,
    );
  }
  for (const kind of ['bleed', 'poison', 'burn', 'roots', 'silence'] as const) {
    stackLabels[kind] = [];
    const fillText = canvas.fillText.bind(canvas);
    canvas.fillText = (text, x, y) => {
      stackLabels[kind].push(text);
      fillText(text, x, y);
    };
    compare(
      kind,
      (ctx) =>
        drawDebuffs(
          ctx,
          {
            debuffs: [{ kind, stacks: 1, ...(kind === 'silence' ? {} : { expiresAt: 1000 }) }],
          },
          80,
          100,
          kind === 'silence' ? 50_000 : 0,
        ),
      81,
      89,
    );
    canvas.fillText = fillText;
  }
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
