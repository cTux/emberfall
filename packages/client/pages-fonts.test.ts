import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { build, preview } from 'vite';

for (const base of ['/', '/emberfall/']) {
  test(`production fonts load and reuse the preload at ${base}`, async (t) => {
    const outDir = await mkdtemp(join(tmpdir(), 'emberfall-fonts-'));
    t.after(() => rm(outDir, { recursive: true, force: true }));
    const root = fileURLToPath(new URL('.', import.meta.url));
    await build({ root, base, logLevel: 'silent', build: { outDir } });
    const server = await preview({
      root,
      base,
      configFile: false,
      build: { outDir },
      preview: { host: '127.0.0.1', port: 0, open: false },
    });
    t.after(() => server.close());
    const browser = await chromium.launch({
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    });
    t.after(() => browser.close());
    const page = await browser.newPage();
    await page.route('**/api/account', (route) =>
      route.fulfill({
        json: { mode: 'steam', authenticated: false, nickname: null, steamName: '' },
      }),
    );
    const fontRequests: string[] = [];
    page.on('request', (request) => {
      if (request.resourceType() === 'font') fontRequests.push(new URL(request.url()).pathname);
    });
    assert.ok(server.resolvedUrls);
    await page.goto(server.resolvedUrls.local[0]);
    await page.getByRole('link', { name: 'Sign in through Steam' }).waitFor();
    const fonts = await page.evaluate(async () => {
      const faces = await Promise.all(
        ['16px', '500 16px', 'bold 16px', 'italic 16px'].map((style) =>
          document.fonts.load(`${style} "Alegreya Sans"`),
        ),
      );

      return faces.map((group) => group.map((face) => face.status));
    });
    assert.deepEqual(fonts, [['loaded'], ['loaded'], ['loaded'], ['loaded']]);
    const preload = await page.locator('link[rel="preload"][as="font"]').getAttribute('href');
    assert.equal(preload, `${base}fonts/AlegreyaSans-Regular.ttf`);
    assert.deepEqual(
      fontRequests.sort(),
      ['Bold', 'Italic', 'Medium', 'Regular'].map(
        (style) => `${base}fonts/AlegreyaSans-${style}.ttf`,
      ),
    );
  });
}
