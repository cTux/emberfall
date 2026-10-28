import { test, expect } from './fixtures';

test.use({ graphicsPreset: null });

test('saved fonts render at fractional and high pixel densities', async ({ browser, baseURL }) => {
  for (const deviceScaleFactor of [1, 1.25, 1.5, 2]) {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 960, height: 640 },
      deviceScaleFactor,
    });
    try {
      await context.addInitScript(() => {
        localStorage.setItem('emberfall-new.preferences', JSON.stringify({ font: 'Inter' }));
      });
      const page = await context.newPage();
      await page.goto(baseURL!);
      await expect(page.locator('body')).toHaveCSS('font-family', 'Inter, sans-serif');
      await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
      await expect(page.locator('canvas').first()).toHaveAttribute('data-renderer', 'pixijs-webgl');
      await page.screenshot({ path: `test-results/font-density-${deviceScaleFactor}.png` });
    } finally {
      await context.close();
    }
  }
});

test('failed font downloads retain the current working font', async ({ page }) => {
  await page.route('**/fonts/Inter-*.ttf', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('body')).toHaveCSS('font-family', '"Alegreya Sans", sans-serif');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('tab', { name: 'Graphics', exact: true }).click();
  await page.getByRole('combobox', { name: 'Font', exact: true }).click();
  await page.getByRole('option', { name: 'Inter', exact: true }).click();
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('body')).toHaveCSS('font-family', '"Alegreya Sans", sans-serif');
});

test('font selection updates UI and world text, survives presets and reload, and scales smoothly', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  const canvas = page.locator('canvas').first();
  await expect(canvas).toHaveAttribute('data-renderer', 'pixijs-webgl');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('tab', { name: 'Graphics', exact: true }).click();
  for (const font of ['Inter', 'Source Sans 3', 'Atkinson Hyperlegible Next', 'Alegreya Sans']) {
    await page.getByRole('combobox', { name: 'Font', exact: true }).click();
    await page.getByRole('option', { name: font, exact: true }).click();
    await expect(page.locator('body')).toHaveCSS(
      'font-family',
      font === 'Inter' ? 'Inter, sans-serif' : `"${font}", sans-serif`,
    );
    await expect
      .poll(async () => {
        const stats = JSON.parse((await canvas.getAttribute('data-render-stats'))!);
        return stats.text.fontFamily;
      })
      .toBe(`"${font}", sans-serif`);
    expect(
      await page.evaluate(
        (family) =>
          ['400', '500', '700', 'italic 400'].every((weight) =>
            document.fonts.check(`${weight} 16px "${family}"`),
          ),
        font,
      ),
    ).toBe(true);
    for (const zoom of [0.8, 1, 1.25, 1.5]) {
      await page.evaluate((value) => {
        document.body.style.zoom = String(value);
      }, zoom);
      await expect(canvas).toHaveCSS('image-rendering', 'auto');
      await page.screenshot({ path: `test-results/font-${font.replaceAll(' ', '-')}-${zoom}.png` });
    }
    await page.evaluate(() => {
      document.body.style.zoom = '';
    });
  }
  await page.getByRole('combobox', { name: 'Font', exact: true }).click();
  await page.getByRole('option', { name: 'Inter', exact: true }).click();
  await page.getByRole('button', { name: 'Low', exact: true }).click();
  await page.getByLabel('Smooth textures', { exact: true }).uncheck();
  await expect(page.getByRole('combobox', { name: 'Font', exact: true })).toHaveText('Inter');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('font-family', 'Inter, sans-serif');
  await expect(canvas).toHaveCSS('image-rendering', 'auto');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('tab', { name: 'Graphics', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Font', exact: true })).toHaveText('Inter');
  await expect(page.getByLabel('Smooth textures', { exact: true })).not.toBeChecked();
  expect(errors).toEqual([]);
});

test('the bundled Alegreya Sans font loads and is used throughout the interface', async ({
  page,
}) => {
  const response = await page.request.get('/fonts/AlegreyaSans-Regular.ttf');
  expect(response.ok()).toBe(true);
  expect((await response.body()).length).toBeGreaterThan(70000);
  await page.goto('/');
  expect(
    await page.evaluate(async () => {
      const faces = (
        await Promise.all(
          ['16px', '500 16px', 'bold 16px', 'italic 16px'].map((style) =>
            document.fonts.load(`${style} "Alegreya Sans"`),
          ),
        )
      ).flat();
      return faces.length > 0 && faces.every((face) => face.status === 'loaded');
    }),
  ).toBe(true);
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const selector of ['h2', 'input', 'button']) {
      await expect(page.locator(selector).first()).toHaveCSS(
        'font-family',
        '"Alegreya Sans", sans-serif',
      );
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/font-lobby-${viewport.width}.png` });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('tab', { name: 'Graphics', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Frame rate limit' })).toHaveCSS(
    'font-family',
    '"Alegreya Sans", sans-serif',
  );
  await page.screenshot({ path: 'test-results/font-settings.png' });
  await page.getByRole('button', { name: 'Close Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Codex', exact: true }).click();
  for (const selector of ['[role="dialog"] h3', '[role="tabpanel"] p']) {
    await expect(page.locator(selector).first()).toHaveCSS(
      'font-family',
      '"Alegreya Sans", sans-serif',
    );
  }
  await page.screenshot({ path: 'test-results/font-codex.png' });
});
