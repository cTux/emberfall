import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test, expect } from './fixtures';
import { BUILDINGS, ARENA } from '../packages/core/src/index';

test('buildings retain native crops, source proportions and matching grounded shadow masks', async ({
  page,
}) => {
  const require = createRequire(resolve('packages/client/package.json'));
  const { build } = await import(pathToFileURL(require.resolve('vite')).href);
  const bundle = await build({
    configFile: false,
    root: resolve('packages/client'),
    logLevel: 'error',
    build: {
      write: false,
      lib: {
        entry: resolve('tests/village-scenery-fixture.ts'),
        name: 'VillageScenery',
        formats: ['iife'],
      },
    },
  });
  const code = bundle[0].output.find((item: { type: string }) => item.type === 'chunk').code;
  let release: () => void = () => {};
  const gate = new Promise<void>((done) => {
    release = done;
  });
  await page.route('**/assets/wardrobe-style/buildings.png', async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto('/?art-gallery');
  await page.addScriptTag({ content: code });
  const pending = await page.evaluate(async () => {
    const fixture = (
      window as unknown as { VillageScenery: typeof import('./village-scenery-fixture') }
    ).VillageScenery;
    while (
      fixture.artImages
        .filter((image) => image !== fixture.buildingArt)
        .some((image) => !image.complete || image.dataset.artReady !== 'true') ||
      !fixture.terrainArt.complete ||
      Object.values(fixture.villageImages).some((image) => !image.complete)
    )
      await new Promise((done) => setTimeout(done, 20));
    return fixture.villageBackground(fixture.GRAPHICS_PRESETS.High) === undefined;
  });
  expect(pending).toBe(true);
  release();
  const buildings = await page.evaluate(async () => {
    const fixture = (
      window as unknown as { VillageScenery: typeof import('./village-scenery-fixture') }
    ).VillageScenery;
    await fixture.buildingArt.decode();
    const prepared = fixture.villageBackground(fixture.GRAPHICS_PRESETS.High)!;
    const buildings = prepared.scenery.filter(
      (object) => object.id.startsWith('building:') && object.id !== 'building:wardrobe',
    );
    const preview = document.createElement('canvas');
    preview.id = 'building-shadows';
    preview.width = 1200;
    preview.height = 650;
    preview.style.cssText = 'position:static;width:1200px;height:650px;object-fit:contain';
    document.body.replaceChildren(preview);
    const ctx = preview.getContext('2d')!;
    ctx.fillStyle = '#677452';
    ctx.fillRect(0, 0, preview.width, preview.height);
    for (const [index, frame] of fixture.buildingFrames.entries()) {
      const object = buildings.find((object) => object.sprite.width === frame.width)!;
      for (let row = 0; row < 2; row++) {
        const caster = { ...object, x: 150 + index * 390, y: 220 + row * 310 };
        const light = row
          ? { x: caster.x - 75, y: caster.y + 20, height: 200, radius: 250, strength: 1 }
          : undefined;
        fixture.castShadow(ctx, caster, light);
        ctx.drawImage(
          caster.sprite,
          caster.x - caster.width / 2,
          caster.y - caster.height,
          caster.width,
          caster.height,
        );
        ctx.fillStyle = '#f6ecd5';
        ctx.font = '18px sans-serif';
        ctx.fillText(row ? 'Nearby lamp' : 'Sunlight', caster.x - 60, caster.y + 100);
      }
    }
    return buildings.map((object) => {
      const frame = fixture.buildingFrames.find((frame) => frame.width === object.sprite.width)!;
      const crop = document.createElement('canvas');
      crop.width = frame.width;
      crop.height = frame.height;
      const cropCtx = crop.getContext('2d')!;
      cropCtx.drawImage(
        fixture.buildingArt,
        frame.x,
        frame.y,
        frame.width,
        frame.height,
        0,
        0,
        frame.width,
        frame.height,
      );
      const source = cropCtx.getImageData(0, 0, crop.width, crop.height).data;
      const sprite = object.sprite
        .getContext('2d')!
        .getImageData(0, 0, crop.width, crop.height).data;
      const mask = (object.mask as HTMLCanvasElement)
        .getContext('2d')!
        .getImageData(0, 0, crop.width, crop.height).data;
      const bottom = sprite.slice((crop.height - 1) * crop.width * 4);
      return {
        id: object.id,
        width: object.width,
        height: object.height,
        ratio: frame.width / frame.height,
        native: sprite.every((value, i) => value === source[i]),
        matchingMask: mask.every((value, i) => i % 4 !== 3 || value === sprite[i]),
        grounded: bottom.some((value, i) => i % 4 === 3 && value >= 32),
        opaque: sprite.filter((value, i) => i % 4 === 3 && value >= 128).length,
        groundY: object.y,
      };
    });
  });
  expect(buildings).toHaveLength(BUILDINGS.length);
  for (const building of BUILDINGS) {
    const rendered = buildings.find((object) => object.id === `building:${building.id}`)!;
    expect(rendered.width).toBe(building.sourceWidth * 2);
    expect(rendered.groundY).toBe(building.y);
    expect(rendered.width / rendered.height).toBeCloseTo(rendered.ratio, 12);
    expect(rendered.native).toBe(true);
    expect(rendered.matchingMask).toBe(true);
    expect(rendered.grounded).toBe(true);
    expect(rendered.opaque).toBeGreaterThan(200000);
  }
  await page
    .locator('#building-shadows')
    .screenshot({ path: 'test-results/building-shadow-preview.png' });
});

for (const graphicsPreset of ['High', 'Low'] as const) {
  test.describe(graphicsPreset, () => {
    test.use({ graphicsPreset });
    test('regenerated buildings render in the village and at the wrapped edge', async ({
      page,
      game,
    }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto('/');
      await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
      await expect(page.locator('canvas')).toHaveAttribute('data-renderer', 'pixijs-webgl');
      const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
      const player = [...world.players.values()][0];
      player.x = 485;
      player.y = 300;
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `test-results/buildings-village-${graphicsPreset}.png` });
      player.x = ARENA.width - 10;
      player.y = 180;
      await page.waitForTimeout(500);
      await page.screenshot({ path: `test-results/buildings-seam-${graphicsPreset}.png` });
      expect(errors).toEqual([]);
    });
  });
}
