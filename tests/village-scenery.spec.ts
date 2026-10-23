import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test, expect } from './fixtures';
import { PLANTS, ROCKS, ARENA } from '../packages/core/src/index';

test('village waits for plant art and packages five distinct silhouettes with shared masks', async ({
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
  await page.route('**/assets/wardrobe-style/plants.png', async (route) => {
    await gate;
    await route.continue();
  });
  await page.route('**/village-scenery-preview', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<body style="margin:0;background:#323b2d"></body>',
    }),
  );
  await page.goto('/village-scenery-preview');
  await page.addScriptTag({ content: code });
  const pending = await page.evaluate(async () => {
    const fixture = (
      window as unknown as { VillageScenery: typeof import('./village-scenery-fixture') }
    ).VillageScenery;
    while (
      fixture.artImages
        .filter((image) => image !== fixture.plantArt)
        .some((image) => !image.complete || image.dataset.artReady !== 'true') ||
      !fixture.terrainArt.complete ||
      Object.values(fixture.villageImages).some((image) => !image.complete)
    )
      await new Promise((done) => setTimeout(done, 20));
    return fixture.villageBackground(fixture.GRAPHICS_PRESETS.High) === undefined;
  });
  expect(pending).toBe(true);
  release();
  const result = await page.evaluate(async () => {
    const fixture = (
      window as unknown as { VillageScenery: typeof import('./village-scenery-fixture') }
    ).VillageScenery;
    while (fixture.artImages.some((image) => !image.complete || image.dataset.artReady !== 'true'))
      await new Promise((done) => setTimeout(done, 20));
    const scenery = fixture.villageSprites(
      ...(Array<HTMLImageElement>(5).fill(new Image()) as [
        HTMLImageElement,
        HTMLImageElement,
        HTMLImageElement,
        HTMLImageElement,
        HTMLImageElement,
      ]),
    );
    const plants = scenery.filter((object) => object.id.startsWith('plant:'));
    const rocks = scenery.filter((object) => object.id.startsWith('rock:'));
    const sprites = [...new Set(plants.map((plant) => plant.sprite))];
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 240;
    document.body.append(canvas);
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#323b2d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const signatures = sprites.map((sprite, index) => {
      ctx.drawImage(sprite, 20 + index * 150, 25, 128, 128);
      ctx.drawImage(sprite, 65 + index * 150, 180, 36, 36);
      return sprite.toDataURL();
    });
    ctx.drawImage(rocks[0].sprite, 760, 25, 128, 128);
    return {
      plants: plants.length,
      rocks: rocks.length,
      signatures: new Set(signatures).size,
      masks: new Set(plants.map((plant) => plant.mask)).size,
      sorted: scenery.every((object, index) => index === 0 || scenery[index - 1].y <= object.y),
      opaque: sprites.map((sprite) => {
        const pixels = sprite.getContext('2d')!.getImageData(0, 0, 64, 64).data;
        let count = 0;
        for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) count++;
        return count;
      }),
    };
  });
  expect(result.plants).toBe(PLANTS.length);
  expect(result.rocks).toBe(ROCKS.length);
  expect(result.signatures).toBe(5);
  expect(result.masks).toBe(5);
  expect(result.sorted).toBe(true);
  for (const count of result.opaque) expect(count).toBeGreaterThan(300);
  await page.locator('canvas').screenshot({ path: 'test-results/village-plants-rocks-atlas.png' });
});

test('rocks and plants render in the village and across wrapped seams', async ({ page, game }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-renderer', 'pixijs-webgl');
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  const plant = PLANTS.find((object) => object.x > 1300 && object.x < 2000)!;
  player.x = plant.x;
  player.y = plant.y;
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/village-rocks-plants.png' });
  player.x = ARENA.width - 10;
  player.y = ARENA.height - 10;
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/village-scenery-seams.png' });
  expect(errors).toEqual([]);
});
