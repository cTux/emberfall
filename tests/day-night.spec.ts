import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test, expect } from './fixtures';

test('day-night tint changes sprites, preserves warnings and lights, and repeats', async ({
  page,
}) => {
  const require = createRequire(resolve('packages/client/package.json'));
  const { build } = await import(pathToFileURL(require.resolve('vite')).href);
  const bundle = await build({
    configFile: false,
    root: resolve('packages/client'),
    logLevel: 'error',
    define: { 'process.env.NODE_ENV': '"production"' },
    build: {
      write: false,
      lib: { entry: resolve('tests/day-night-fixture.ts'), name: 'Cycle', formats: ['iife'] },
    },
  });
  await page.route('**/cycle-test', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }),
  );
  await page.goto('/cycle-test');
  await page.addScriptTag({
    content: bundle[0].output.find((item: { type: string }) => item.type === 'chunk').code,
  });
  const samples = await page.evaluate(() =>
    (window as unknown as { Cycle: { sample(): Promise<number[][][]> } }).Cycle.sample(),
  );
  expect(samples[0][0]).toEqual([255, 255, 255, 255]);
  expect(samples[2][0][2]).toBeGreaterThan(samples[2][0][0]);
  expect(samples[2][0][0]).toBeGreaterThan(120);
  for (const frame of samples) {
    expect(frame[1]).toEqual([255, 0, 0, 255]);
    expect(frame[2]).toEqual([255, 255, 255, 255]);
  }
  expect(samples[3]).toEqual(samples[0]);
});

test('cycle renders in village and forest through a real session', async ({ page, game }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-daylight', /\d\.\d{3}/);
  await page.screenshot({ path: 'test-results/day-night-village.png' });
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  game.runtime.parties(world).run(player).scene = {
    ...world.training!,
    id: 'cycle-forest',
    electorate: '',
    training: false,
    enemies: [],
    endsAt: Date.now() + 60000,
    nextSpawn: Date.now() + 60000,
  };
  player.scene = 'forest';
  player.x = 12;
  player.y = 300;
  await expect(canvas).toHaveAttribute('aria-label', 'Forest combat scene.');
  await page.screenshot({ path: 'test-results/day-night-forest.png' });
  await page.keyboard.press('d');
  await expect.poll(() => player.x).toBeGreaterThan(12);
  expect(errors).toEqual([]);
});
