import { PixiContext } from '../packages/client/src/rendering/pixi-context';
import { drawVignette, drawAtmosphere } from '../packages/client/src/effects';
import {
  drawDebuffs,
  drawClassProjectiles,
  drawLootAndBlood,
} from '../packages/client/src/combat-effects';
import { pickupArt, effectsArt, artImages } from '../packages/client/src/art';
import { LOOT_ITEM_IDS } from '../packages/core/src/index';
import type { SceneState } from '../packages/common/src/index';
import { statusImages } from '../packages/client/src/combat-assets';
import { drawFog } from '../packages/client/src/forest';
import { lightTexture } from '../packages/client/src/village';
import { drawDamageNumber, drawDamageNumbers } from '../packages/client/src/damage-text';

export async function compare() {
  await Promise.all(Object.values(statusImages).map((image) => image.decode()));
  const gpu = document.createElement('canvas'),
    reference = document.createElement('canvas');
  document.body.append(gpu, reference);
  reference.width = reference.height = 256;
  const pixi = new PixiContext(gpu);
  pixi.resize(256, 256);
  await pixi.ready;
  const canvas = reference.getContext('2d')!;
  const results: Record<string, { actual: number[]; expected: number[] }> = {};
  const icons: Record<string, number> = {};
  const stackLabels: Record<string, string[]> = {};
  const compare = (
    name: string,
    draw: (ctx: CanvasRenderingContext2D) => void,
    x: number,
    y: number,
  ) => {
    pixi.begin();
    canvas.reset();
    for (const ctx of [pixi as unknown as CanvasRenderingContext2D, canvas]) {
      ctx.fillStyle = '#809060';
      ctx.fillRect(0, 0, 256, 256);
      draw(ctx);
    }
    pixi.present();
    const capture = document.createElement('canvas');
    capture.width = capture.height = 256;
    const ctx = capture.getContext('2d')!;
    ctx.drawImage(gpu, 0, 0);
    results[name] = {
      actual: [...ctx.getImageData(x, y, 1, 1).data],
      expected: [...canvas.getImageData(x, y, 1, 1).data],
    };
    if (name in statusImages) {
      // Exclude the stack numeral and count colored glyph pixels, allowing the
      // small antialiasing differences between SVG scaling and nearest textures.
      const pixels = ctx.getImageData(80, 88, 12, 6).data;
      icons[name] = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const channels = [pixels[i], pixels[i + 1], pixels[i + 2]];
        if (Math.max(...channels) - Math.min(...channels) > 40) icons[name]++;
      }
      delete results[name];
    }
  };
  compare('vignette center', (ctx) => drawVignette(ctx, 0, 0, 256, 256), 128, 128);
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

  const light = { x: 100, y: 100, radius: 80, height: 100, strength: 0.3, owner: 'test' };
  const mask = document.createElement('canvas');
  mask.width = mask.height = 16;
  mask.getContext('2d')!.fillRect(0, 0, 16, 16);
  const caster = { id: 'blocker', x: 120, y: 100, width: 16, height: 16, mask };
  const revision = (canvas: HTMLCanvasElement) =>
    (canvas as HTMLCanvasElement & { textureRevision: number }).textureRevision;
  const first = revision(lightTexture(light, [caster], true));
  const reused = revision(lightTexture(light, [caster], true));
  const translated = revision(lightTexture({ ...light, x: 150 }, [{ ...caster, x: 170 }], true));
  const moved = revision(lightTexture(light, [{ ...caster, x: 140 }], true));
  const toggled = revision(lightTexture(light, [caster], false));
  const lights = { first, reused, translated, moved, toggled };

  pixi.begin();
  pixi.fillStyle = '#000000';
  pixi.fillRect(0, 0, 256, 256);
  pixi.scale(8, 8);
  pixi.font = '12px sans-serif';
  pixi.textBaseline = 'top';
  pixi.fillStyle = '#ffffff';
  pixi.fillText('Pixels', 2, 2);
  pixi.present();
  const glyph = document.createElement('canvas');
  glyph.width = glyph.height = 256;
  const glyphCtx = glyph.getContext('2d')!;
  glyphCtx.drawImage(gpu, 0, 0);
  const pixels = glyphCtx.getImageData(0, 0, 256, 256).data;
  // A 4x text texture at 8x world scale repeats each raster column twice. Linear filtering
  // instead introduces intermediate columns and fails this edge-grid check.
  const edges = [0, 0];
  for (let y = 0; y < 100; y++)
    for (let x = 1; x < 220; x++)
      if (pixels[(y * 256 + x) * 4] !== pixels[(y * 256 + x - 1) * 4]) edges[x % 2]++;
  glyph.style.imageRendering = 'pixelated';
  document.body.append(glyph);
  // Leave both renderers showing the same composited scene for visual inspection.
  compare(
    'composite',
    (ctx) => {
      for (const [i, image] of Object.values(statusImages).entries())
        ctx.drawImage(image, 20 + i * 55, 100, 40, 40);
      drawVignette(ctx, 0, 0, 256, 256);
    },
    128,
    128,
  );
  pixi.begin();
  pixi.fillStyle = '#17251d';
  pixi.fillRect(0, 0, 256, 256);
  for (const [index, damageType] of (['physical', 'fire', 'poison', 'nature'] as const).entries()) {
    for (const critical of [false, true])
      drawDamageNumber(
        pixi as unknown as CanvasRenderingContext2D,
        { id: index, x: 0, y: 0, amount: 15, at: 1000, target: 'enemy:1', damageType, critical },
        { x: 32 + index * 64, y: critical ? 120 : 70 },
        1000,
      );
  }
  pixi.present();
  const damagePreview = document.createElement('canvas');
  damagePreview.width = damagePreview.height = 256;
  damagePreview.style.width = '512px';
  damagePreview.style.imageRendering = 'pixelated';
  const damageContext = damagePreview.getContext('2d')!;
  damageContext.drawImage(gpu, 0, 0);
  document.body.append(damagePreview);
  const damagePixels = Array.from({ length: 4 }, (_, index) => {
    const pixels = damageContext.getImageData(index * 64, 50, 64, 50).data;
    let white = 0,
      red = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] > 235 && pixels[i + 1] > 235 && pixels[i + 2] > 235) white++;
      if (pixels[i] > 150 && pixels[i + 1] < 90 && pixels[i + 2] < 110) red++;
    }
    return { white, red };
  });
  pixi.begin();
  pixi.fillStyle = '#17251d';
  pixi.fillRect(0, 0, 256, 256);
  const groupedLabels: string[] = [];
  const fillText = pixi.fillText.bind(pixi);
  pixi.fillText = (text, x, y) => {
    groupedLabels.push(String(text));
    fillText(text, x, y);
  };
  drawDamageNumbers(
    pixi as unknown as CanvasRenderingContext2D,
    [
      {
        id: 1,
        ownerId: 'mage',
        target: 'enemy:1',
        damageType: 'fire',
        amount: 3,
        at: 1000,
        x: 128,
        y: 128,
      },
      {
        id: 2,
        ownerId: 'mage',
        target: 'enemy:1',
        damageType: 'fire',
        amount: 4.5,
        critical: true,
        at: 1010,
        x: 128,
        y: 128,
      },
    ],
    (x, y) => ({ x, y }),
    1010,
  );
  pixi.fillText = fillText;
  pixi.present();
  while (
    [pickupArt, effectsArt].some((image) => !image.complete || image.dataset.artReady !== 'true')
  )
    await new Promise((resolve) => setTimeout(resolve, 20));
  const projectilePixels: number[] = [];
  for (const fallback of [false, true]) {
    pixi.begin();
    pixi.fillStyle = '#17251d';
    pixi.fillRect(0, 0, 256, 256);
    if (fallback) for (const image of [pickupArt, effectsArt]) image.dataset.artReady = 'false';
    for (const [row, kind] of (['arrow', 'fireball', 'roots'] as const).entries()) {
      for (let frame = 0; frame < (kind === 'arrow' ? 4 : 3); frame++) {
        const x = 32 + frame * 64,
          y = 40 + row * 80;
        drawClassProjectiles(
          pixi as unknown as CanvasRenderingContext2D,
          {
            playerShots: [{ kind, x, y, angle: (frame * Math.PI) / 3 }],
            explosions: [],
          } as unknown as SceneState,
          frame * 100,
          (x, y) => ({ x, y }),
        );
      }
    }
    pixi.present();
    const preview = document.createElement('canvas');
    preview.width = preview.height = 256;
    preview.style.width = '512px';
    preview.style.imageRendering = 'pixelated';
    const c = preview.getContext('2d')!;
    c.drawImage(gpu, 0, 0);
    document.body.append(preview);
    for (const [row, kind] of (['arrow', 'fireball', 'roots'] as const).entries())
      for (let frame = 0; frame < (kind === 'arrow' ? 4 : 3); frame++) {
        const pixels = c.getImageData(frame * 64, row * 80 + 8, 64, 64).data;
        let green = 0;
        for (let i = 0; i < pixels.length; i += 4)
          if (
            pixels[i] >= 175 &&
            pixels[i + 1] >= 245 &&
            pixels[i + 2] >= 155 &&
            pixels[i + 2] <= 185
          )
            green++;
        projectilePixels.push(green);
      }
    if (fallback) for (const image of [pickupArt, effectsArt]) image.dataset.artReady = 'true';
  }
  const drops = [...LOOT_ITEM_IDS, 'health-potion'].map((itemId, id) => ({
    id,
    itemId,
    kind: 'item' as const,
    x: 32 + (id % 4) * 64,
    y: 40 + Math.floor(id / 4) * 64,
    at: 1000,
  }));
  const drawDrops = () => {
    pixi.begin();
    drawLootAndBlood(
      pixi as unknown as CanvasRenderingContext2D,
      { drops, damage: [] } as unknown as SceneState,
      1000,
      (x, y) => ({ x, y }),
      { x: 0, y: 0, width: 256, height: 256 },
    );
    pixi.present();
  };
  drawDrops();
  while (artImages.some((image) => !image.complete || image.dataset.artReady !== 'true'))
    await new Promise((resolve) => setTimeout(resolve, 20));
  drawDrops();
  const lootPreview = document.createElement('canvas');
  lootPreview.width = lootPreview.height = 256;
  lootPreview.style.width = '512px';
  lootPreview.style.imageRendering = 'pixelated';
  const lootContext = lootPreview.getContext('2d')!;
  lootContext.drawImage(gpu, 0, 0);
  document.body.append(lootPreview);
  const lootPixels = drops.map(({ itemId, x, y }) => {
    const pixels = lootContext.getImageData(x - 12, y - 18, 24, 30).data;
    let colored = 0,
      purple = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] > 128) colored++;
      if (pixels[i] === 195 && pixels[i + 1] === 166 && pixels[i + 2] === 232) purple++;
    }
    const red = (dx: number, dy: number) => lootContext.getImageData(x + dx, y + dy, 1, 1).data[0];
    return {
      itemId,
      colored,
      purple,
      beam: red(0, -18),
      above: red(0, -23),
      beside: red(5, -18),
    };
  });
  pixi.resize(850, 260);
  pixi.begin();
  pixi.fillStyle = '#17251d';
  pixi.fillRect(0, 0, 850, 260);
  const ages = [0, 80, 220, 600, 750];
  for (const [index, age] of ages.entries())
    for (const critical of [false, true])
      drawDamageNumber(
        pixi as unknown as CanvasRenderingContext2D,
        { id: 2, x: 0, y: 0, amount: 125, at: 1000, target: 'enemy:1', critical },
        { x: 85 + index * 170, y: critical ? 250 : 120 },
        1000 + age,
      );
  pixi.present();
  const battlePreview = document.createElement('canvas');
  battlePreview.width = 850;
  battlePreview.height = 260;
  battlePreview.dataset.preview = 'battle-text';
  const battleContext = battlePreview.getContext('2d')!;
  battleContext.drawImage(gpu, 0, 0);
  document.body.append(battlePreview);
  const battleTextPixels = [false, true].map((critical) =>
    ages.map((age, index) => {
      const pixels = battleContext.getImageData(index * 170, critical ? 130 : 0, 170, 130).data;
      let count = 0,
        top = 130,
        bottom = 0;
      for (let y = 0; y < 130; y++)
        for (let x = 0; x < 170; x++) {
          const offset = (y * 170 + x) * 4;
          if (
            Math.abs(pixels[offset] - 23) +
              Math.abs(pixels[offset + 1] - 37) +
              Math.abs(pixels[offset + 2] - 29) >
            30
          ) {
            count++;
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
        }
      return { age, count, top, height: count ? bottom - top + 1 : 0 };
    }),
  );
  pixi.destroy();
  return {
    results,
    icons,
    stackLabels,
    lights,
    edges,
    damagePixels,
    groupedLabels,
    projectilePixels,
    lootPixels,
    battleTextPixels,
  };
}
