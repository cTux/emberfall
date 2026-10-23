import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test, expect } from './fixtures';

test('all eight NPC work items render particles in Pixi and respect the particle toggle', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const require = createRequire(resolve('packages/client/package.json'));
  const { build } = await import(pathToFileURL(require.resolve('vite')).href);
  const bundle = await build({
    configFile: false,
    root: resolve('packages/client'),
    logLevel: 'error',
    define: { 'process.env.NODE_ENV': '"production"' },
    build: {
      write: false,
      minify: false,
      lib: {
        entry: resolve('tests/npc-work-preview.ts'),
        name: 'NpcWorkPreview',
        formats: ['iife'],
      },
    },
  });
  const code = bundle[0].output.find((item: { type: string }) => item.type === 'chunk').code;
  await page.route('**/npc-work-preview', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<html><body style="margin:0"></body></html>',
    }),
  );
  await page.goto('/npc-work-preview');
  await page.addScriptTag({ content: code });
  const result = await page.evaluate(() =>
    (
      window as unknown as {
        NpcWorkPreview: typeof import('./npc-work-preview');
      }
    ).NpcWorkPreview.preview(),
  );
  expect(result.disabled).toEqual(Array(8).fill(0));
  expect(result.counts).toHaveLength(8);
  for (const count of result.counts) expect(count).toBeGreaterThan(10);
  await page.locator('canvas').screenshot({ path: 'test-results/npc-work-particles.png' });
  expect(errors).toEqual([]);
});
