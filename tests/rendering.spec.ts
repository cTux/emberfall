// Warm renderer resources for three seconds before frame measurement.
const RENDERER_WARMUP_MS = 3000;
import { sampleFrameTiming } from './frame-timing';
import { test, expect } from './fixtures';
test.use({ graphicsPreset: 'High' });

test('High graphics uses viewport-sized WebGL with bounded cached resources', async ({
  page,
  browser,
}, testInfo) => {
  const session = await browser.newBrowserCDPSession();
  const system = await session.send('SystemInfo.getInfo');
  await session.detach();
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    return errors.push(error.message);
  });
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-renderer', 'pixijs-webgl');
  expect(
    await canvas.evaluate((canvas: HTMLCanvasElement) => {
      return {
        width: canvas.width,
        height: canvas.height,
        canvas2d: !!canvas.getContext('2d'),
      };
    }),
  ).toEqual({ width: 2160, height: 1500, canvas2d: false });
  await page.waitForTimeout(RENDERER_WARMUP_MS);
  const timing = await page.evaluate(sampleFrameTiming, undefined);
  const stats = JSON.parse((await canvas.getAttribute('data-render-stats'))!);
  console.log('High village renderer measurement', JSON.stringify({ timing, stats }));
  await testInfo.attach('renderer-measurement', {
    body: JSON.stringify(
      {
        browser: browser.version(),
        gpu: system.gpu,
        viewport: page.viewportSize(),
        preset: 'High',
        warmupMs: 3000,
        sampleMs: timing.sampleMs,
        timing,
        stats,
      },
      null,
      2,
    ),
    contentType: 'application/json',
  });
  expect(stats.textures).toBeLessThan(150);
  expect(stats.gradients).toBeLessThan(150);
  expect(stats.visuals).toBeLessThan(5000);
  expect(timing.frames).toBeGreaterThan(5);
  await page.screenshot({ path: 'test-results/new-pixi-high-preview.png' });
  expect(errors).toEqual([]);
});
