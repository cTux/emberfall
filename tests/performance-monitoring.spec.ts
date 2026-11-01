import { test, expect } from './fixtures';

test('memoized performance traces keep sampling and react to series visibility', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('emberfall-new.preferences', JSON.stringify({ fps: true, latency: true }));
  });
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  const monitor = page.getByRole('complementary', { name: 'Performance monitor' });
  const fps = monitor.locator('[data-series="fps"]');
  await expect(fps).toHaveAttribute('d', /M/);
  const initial = await fps.getAttribute('d');
  await expect
    .poll(() => {
      return fps.getAttribute('d');
    })
    .not.toBe(initial);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
  await settings.getByLabel('FPS graph', { exact: true }).uncheck();
  await expect(monitor.locator('[data-series="fps"]')).toHaveCount(0);
  await expect(monitor.locator('[data-series="latency"]')).toHaveCount(1);
  await settings.getByLabel('Latency graph', { exact: true }).uncheck();
  await expect(monitor).toHaveCount(0);
  await settings.getByLabel('FPS graph', { exact: true }).check();
  await expect(fps).toHaveAttribute('d', /M/);
  await expect(monitor.locator('path')).toHaveCount(1);
  await page.getByRole('button', { name: 'Close Settings', exact: true }).click();
  await page.screenshot({ path: 'test-results/performance-monitor-desktop.png' });
});
