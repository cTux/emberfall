import { comparePooling } from './renderer-pooling.fixture';
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
import { drawInteractionOutline } from '../packages/client/src/interaction-targets';

export function compareSurfaces(
  compare: PixelComparison,
  canvas: CanvasRenderingContext2D,
  stackLabels: Record<string, string[]>,
) {
  const mask = document.createElement('canvas');
  mask.width = mask.height = 16;
  mask.getContext('2d')!.fillRect(0, 0, 16, 16);
  const outline = (ctx: CanvasRenderingContext2D) => {
    return drawInteractionOutline(ctx, {
      source: { id: 'fixture', name: 'Fixture', x: 20, y: 20 },
      x: 20,
      y: 20,
      width: 16,
      height: 16,
      mask,
      reach: { x: 20, y: 20 },
      radius: 55,
    });
  };

  compare('interaction outline border', outline, 19, 28);
  compare('interaction outline outside', outline, 18, 28);
  compare(
    'vignette center',
    (ctx) => {
      return drawVignette(ctx, 0, 0, 256, 256);
    },
    128,
    128,
  );
  const health = (ctx: CanvasRenderingContext2D) => {
    return drawPlayerHealth(ctx, 100, 93, 50, 100, 'Hero');
  };

  compare('health border top', health, 90, 93);
  compare('health fill top', health, 90, 94);
  compare('health fill bottom', health, 90, 98);
  compare('health border bottom', health, 82, 99);
  compare('health empty track', health, 110, 94);
  compare('health outside frame', health, 90, 92);
  compare(
    'tree health border',
    (ctx) => {
      return drawResourceHealth(
        ctx,
        { id: 'tree', kind: 'tree', x: 100, y: 140, size: 36 },
        { remaining: 3, restoresAt: 5000 },
      );
    },
    90,
    93,
  );
  compare(
    'gathering border',
    (ctx) => {
      return drawTimedActivity(
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
      );
    },
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
  compare(
    'fog blending',
    (ctx) => {
      return drawFog(ctx, 0, 0, 256, 256, 1000);
    },
    128,
    128,
  );
  compare(
    'vignette edge',
    (ctx) => {
      return drawVignette(ctx, 0, 0, 256, 256);
    },
    5,
    128,
  );
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
    (ctx) => {
      return drawAtmosphere(ctx, 0, 0, 256, 256, 0, { colorGrading: true, lightShafts: false });
    },
    128,
    128,
  );
  compare(
    'light shafts',
    (ctx) => {
      return drawAtmosphere(ctx, 0, 0, 256, 256, 0, { colorGrading: false, lightShafts: true });
    },
    10,
    5,
  );

  for (const [name, x] of [
    ['shaft left feather', 62],
    ['shaft center', 140],
    ['shaft right feather', 218],
  ] as const) {
    compare(
      name,
      (ctx) => {
        return drawAtmosphere(ctx, 0, 0, 256, 256, 0, { colorGrading: false, lightShafts: true });
      },
      x,
      100,
    );
  }

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
      (ctx) => {
        return drawDebuffs(
          ctx,
          {
            debuffs: [{ kind, stacks: 1, ...(kind === 'silence' ? {} : { expiresAt: 1000 }) }],
          },
          80,
          100,
          kind === 'silence' ? 50_000 : 0,
        );
      },
      81,
      89,
    );
    canvas.fillText = fillText;
  }

  comparePooling(compare);
}
