import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test, expect } from './fixtures';
import { starterEquipment } from '../packages/core/src/index';

test('village player masks sample the same high-resolution cells as the visible player', async ({
  page,
  game,
}) => {
  await page.addInitScript(() => {
    const drawImage = Object.getOwnPropertyDescriptor(
      CanvasRenderingContext2D.prototype,
      'drawImage',
    )!.value;
    const samples: number[][] = [];
    Object.assign(window, { playerMaskSamples: samples });
    CanvasRenderingContext2D.prototype.drawImage = function (
      this: CanvasRenderingContext2D,
      source: CanvasImageSource,
      ...coordinates: number[]
    ) {
      if (
        source instanceof HTMLImageElement &&
        source.dataset.artResolution === '2' &&
        source.naturalWidth === 512 &&
        source.naturalHeight === 1280 &&
        coordinates.length === 8
      )
        samples.push(coordinates.slice(0, 4));
      return Reflect.apply(drawImage, this, [source, ...coordinates]);
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  player.classId = 'mage';
  player.equipment = starterEquipment('mage');
  // Stand behind the village inn, reproducing the reported foreground cutout.
  player.x = 235;
  player.y = 205;
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { playerMaskSamples: number[][] }).playerMaskSamples.length,
      ),
    )
    .toBeGreaterThan(1);
  const samples = await page.evaluate(
    () => (window as unknown as { playerMaskSamples: number[][] }).playerMaskSamples,
  );
  await page.screenshot({ path: 'test-results/village-player-cutout.png' });
  expect(samples.filter(([x, y, w, h]) => x % 128 || y % 128 || w !== 128 || h !== 128)).toEqual(
    [],
  );
});

test('foreground sprites reveal a silhouette hole with a 10-pixel margin', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'warning' && /mask|texture/i.test(message.text()))
      errors.push(message.text());
  });
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
        entry: resolve('tests/player-cutout-fixture.ts'),
        name: 'CutoutFixture',
        formats: ['iife'],
      },
    },
  });
  const code = bundle[0].output.find((item: { type: string }) => item.type === 'chunk').code;
  await page.route('**/cutout-test', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }),
  );
  await page.goto('/cutout-test');
  await page.addScriptTag({ content: code });
  const { samples, cached } = await page.evaluate(async () => {
    const fixture = (
      window as unknown as { CutoutFixture: typeof import('./player-cutout-fixture') }
    ).CutoutFixture;
    return fixture.cutoutPixels();
  });
  const ground = [51, 119, 68, 255],
    wall = [153, 51, 34, 255],
    player = [255, 136, 0, 255];
  // Exact mask boundary: 10 pixels reveals ground; the next pixel stays opaque.
  expect(samples.silhouette).toEqual([ground, wall, ground, wall, wall, player, ground]);
  expect(samples['camera-and-clip']).toEqual(samples.silhouette);
  expect(samples.moved).toEqual(samples.silhouette.map(() => wall));
  expect(samples['no-player']).toEqual(samples.moved);
  // Cutting a foreground layer must never erase a previously drawn background.
  expect(samples['background-preserved']).toEqual(samples.moved);
  expect(cached).toBe(true);
  await page.screenshot({ path: 'test-results/player-cutout-pixels.png', fullPage: true });
  expect(errors).toEqual([]);
});
