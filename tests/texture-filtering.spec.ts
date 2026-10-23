import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test, expect } from './fixtures';
import { LOBBY_PORTAL } from '../packages/core/src/index.ts';
import { GRAPHICS_PRESETS } from '../packages/client/src/graphics.ts';

test.use({ graphicsPreset: null });

test('texture filtering changes pixels on cached sources and restores nearest sampling', async ({
  page,
}) => {
  const require = createRequire(resolve('packages/client/package.json'));
  const { build } = await import(pathToFileURL(require.resolve('vite')).href);
  const bundle = await build({
    configFile: false,
    define: { 'process.env.NODE_ENV': '"production"' },
    root: resolve('packages/client'),
    logLevel: 'error',
    build: {
      write: false,
      minify: false,
      lib: {
        entry: resolve('tests/texture-filtering-fixture.ts'),
        name: 'FilteringFixture',
        formats: ['iife'],
      },
    },
  });
  const code = bundle[0].output.find((item: { type: string }) => item.type === 'chunk').code;
  await page.route('**/filtering-test', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }),
  );
  await page.goto('/filtering-test');
  await page.addScriptTag({ content: code });
  const samples = await page.evaluate(async () => {
    const { FilteringFixture } = window as unknown as {
      FilteringFixture: typeof import('./texture-filtering-fixture');
    };
    return FilteringFixture.compareFiltering();
  });
  expect(samples[0]).toEqual([0, 0, 0, 255]);
  expect(samples[1][0]).toBeGreaterThan(50);
  expect(samples[1][0]).toBeLessThan(200);
  expect(samples[2]).toEqual(samples[0]);
  expect(samples[3]).toEqual([0, 0, 255, 255]);
  expect(samples[4]).toEqual([255, 255, 255, 255]);
  await page.screenshot({ path: 'test-results/softer-art-comparison.png', fullPage: true });
});

test('smooth textures apply live in village and forest, follow presets and persist', async ({
  page,
  game,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 960, height: 640 });
  // Exercise migration from saved preferences that predate Smooth textures.
  const { smoothTextures: _, ...legacy } = GRAPHICS_PRESETS.Low;
  await page.addInitScript(
    (settings) => {
      if (!localStorage.getItem('emberfall-new.graphics'))
        localStorage.setItem('emberfall-new.graphics', JSON.stringify(settings));
    },
    { ...legacy, frameLimit: 30 },
  );
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  const canvas = page.locator('canvas').first();
  await expect(canvas).toHaveAttribute('data-renderer', 'pixijs-webgl');
  await expect(canvas).toHaveCSS('image-rendering', 'auto');
  const settings = page.getByRole('button', { name: 'Settings', exact: true });
  const close = page.getByRole('button', { name: 'Close Settings', exact: true });
  await settings.click();
  await page.getByRole('tab', { name: 'Graphics', exact: true }).click();
  const smooth = page.getByLabel('Smooth textures', { exact: true });
  for (const preset of ['High', 'Balanced', 'Low']) {
    await page.getByRole('button', { name: preset, exact: true }).click();
    await expect(smooth).toBeChecked();
  }
  await smooth.uncheck();
  await close.click();
  await expect(canvas).toHaveCSS('image-rendering', 'pixelated');
  await page.screenshot({ path: 'test-results/softer-village-nearest.png' });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  await expect(canvas).toHaveCSS('image-rendering', 'pixelated');
  await settings.click();
  await page.getByRole('tab', { name: 'Graphics', exact: true }).click();
  await expect(smooth).not.toBeChecked();
  await smooth.check();
  await close.click();
  await expect(canvas).toHaveCSS('image-rendering', 'auto');
  await page.screenshot({ path: 'test-results/softer-village-linear.png' });
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  player.x = LOBBY_PORTAL.x - 35;
  player.y = LOBBY_PORTAL.y + 9;
  const portal = page.getByRole('dialog', { name: 'Forest portal' });
  await expect(async () => {
    await page.mouse.move(515, 281);
    await expect(canvas).toHaveAttribute('data-interaction-target', 'portal');
    await expect(canvas).toHaveAttribute('data-interaction-range', 'true');
  }).toPass({ intervals: [200], timeout: 6000 });
  await page.mouse.down();
  await page.mouse.up();
  await expect(portal).toBeVisible();
  await portal.getByRole('button', { name: 'Create', exact: true }).click();
  await portal.getByRole('button', { name: "I'm ready" }).click();
  await expect(page.getByLabel('Forest combat scene.')).toBeVisible({ timeout: 10000 });
  await expect(canvas).toHaveCSS('image-rendering', 'auto');
  await page.screenshot({ path: 'test-results/softer-forest-linear.png' });
  await settings.click();
  await smooth.uncheck();
  await close.click();
  await expect(canvas).toHaveCSS('image-rendering', 'pixelated');
  player.x = 4790;
  player.y = 2550;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/softer-forest-seam-narrow.png' });
  expect(errors).toEqual([]);
});
