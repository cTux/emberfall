import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test, expect } from './fixtures';

test('filter textures are released before resize and disposal', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (/\[BindGroup\]/.test(message.text())) errors.push(message.text());
  });
  const require = createRequire(resolve('packages/client/package.json'));
  const { build } = await import(pathToFileURL(require.resolve('vite')).href);
  const bundle = await build({
    configFile: false,
    // Production removes the warnings this regression test must detect.
    define: { 'process.env.NODE_ENV': '"development"' },
    root: resolve('packages/client'),
    logLevel: 'error',
    build: {
      write: false,
      minify: false,
      lib: {
        entry: resolve('tests/renderer-lifetime-fixture.ts'),
        name: 'RendererLifetimeFixture',
        formats: ['iife'],
      },
    },
  });
  const code = bundle[0].output.find((item: { type: string }) => item.type === 'chunk').code;
  await page.route('**/renderer-lifetime', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }),
  );
  await page.goto('/renderer-lifetime');
  await page.addScriptTag({ content: code });
  const pixels = await page.evaluate(async () => {
    const { RendererLifetimeFixture } = window as unknown as {
      RendererLifetimeFixture: typeof import('./renderer-lifetime-fixture');
    };

    return RendererLifetimeFixture.resizeAndDispose();
  });
  expect(errors).toEqual([]);
  expect(pixels).toHaveLength(3);
  for (const pixel of pixels) {
    expect(pixel).toEqual(pixels[0]);
    expect(pixel[3]).toBe(255);
    expect(pixel[0]).toBeGreaterThan(128);
  }

  await page.screenshot({ path: 'test-results/renderer-lifetime.png' });
});
