import { test, expect } from './fixtures';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
test('all twelve talent cast themes paint generated sprite pixels through Pixi', async ({
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
        entry: resolve('tests/talent-renderer-fixture.ts'),
        name: 'TalentRendererFixture',
        formats: ['iife'],
      },
    },
  });
  const code = bundle[0].output.find((item: { type: string }) => item.type === 'chunk').code;
  await page.route('**/talent-renderer-test', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }),
  );
  await page.goto('/talent-renderer-test');
  await page.addScriptTag({ content: code });
  const counts = await page.evaluate(async () =>
    (
      window as unknown as { TalentRendererFixture: typeof import('./talent-renderer-fixture') }
    ).TalentRendererFixture.render(),
  );
  expect(counts).toHaveLength(12);
  for (const count of counts) expect(count).toBeGreaterThan(200);
  await page
    .locator('[data-preview="talent-casts"]')
    .screenshot({ path: 'test-results/talent-cast-frames.png' });
});
