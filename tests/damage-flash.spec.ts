import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test, expect } from './fixtures';

test('damage flash fades through fractional expiry without a Pixi color crash', async ({
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
        entry: resolve('tests/damage-flash-fixture.ts'),
        name: 'DamageFlashFixture',
        formats: ['iife'],
      },
    },
  });
  const code = bundle[0].output.find((item: { type: string }) => {
    return item.type === 'chunk';
  }).code;
  await page.route('**/damage-flash', (route) => {
    return route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' });
  });
  await page.goto('/damage-flash');
  await page.addScriptTag({ content: code });
  const results = await page.evaluate(async () => {
    const fixture = (
      window as unknown as {
        DamageFlashFixture: typeof import('./damage-flash-fixture');
      }
    ).DamageFlashFixture;

    return fixture.compare();
  });
  for (const { age, alphas, actual, expected } of results) {
    expect(alphas, `restored opacity at ${age}`).toEqual([0.5, 0.5]);
    for (let channel = 0; channel < 4; channel++) {
      expect(
        Math.abs(actual[channel] - expected[channel]),
        `age ${age}, channel ${channel}`,
      ).toBeLessThanOrEqual(1);
    }

    if (age === 0 || age === 140) {
      expect(actual[0]).toBeGreaterThan(128);
    } else {
      expect(actual).toEqual([128, 144, 96, 255]);
    }
  }
});
