import { test, expect } from '@playwright/test';
import { story } from './ui.fixture.ts';

test('performance diagnostics stay compact with readable labels and all traces', async ({
  page,
}, testInfo) => {
  await page.goto(story('components-performancemonitor--network-diagnostics'));
  const monitor = page.getByRole('complementary', { name: 'Performance monitor' });
  await expect(monitor.getByLabel('Frame rate', { exact: true })).toHaveText('244 FPS');
  await expect(monitor.getByLabel('Server latency', { exact: true })).toHaveText('11 ms');
  await expect(monitor.getByLabel('Network scale')).toHaveText('0–145 ms');
  for (const label of ['Input ack', 'Snapshot (local)', 'Ping']) {
    await expect(monitor.getByText(label, { exact: true })).toBeVisible();
  }

  await expect(monitor.locator('svg path')).toHaveCount(4);
  const bounds = await monitor.boundingBox();
  expect(bounds!.width).toBeLessThanOrEqual(224);
  expect(bounds!.height).toBeLessThanOrEqual(100);
  expect(await monitor.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
    true,
  );
  await monitor.screenshot({ path: testInfo.outputPath('compact-performance-monitor.png') });

  for (const [id, visible, hidden] of [
    ['fps-only', 'Frame rate', 'Server latency'],
    ['latency-only', 'Server latency', 'Frame rate'],
  ]) {
    await page.goto(story(`components-performancemonitor--${id}`));
    await expect(monitor.getByLabel(visible, { exact: true })).toBeVisible();
    await expect(monitor.getByLabel(hidden, { exact: true })).toHaveCount(0);
    expect((await monitor.boundingBox())!.height).toBeLessThanOrEqual(100);
  }
});

test('connection states use colored circles without visible text', async ({ page }) => {
  await page.goto(story('components-game-patterns--connection'));
  for (const [name, color] of [
    ['World server online', 'rgb(131, 203, 163)'],
    ['World server connecting', 'rgb(230, 190, 128)'],
    ['World server disconnected', 'rgb(239, 155, 133)'],
  ]) {
    const indicator = page.getByRole('status', { name });
    await expect(indicator).toBeVisible();
    await expect(indicator).toHaveText('');
    await expect(indicator).toHaveCSS('background-color', color);
    await expect(indicator).toHaveCSS('border-radius', '50%');
    await expect(indicator).toHaveCSS('width', '10px');
    await expect(indicator).toHaveCSS('height', '10px');
  }
});

test('meters expose clamped actual units', async ({ page }) => {
  await page.goto(story('components-game-patterns--meter'));
  const health = page.getByRole('progressbar', { name: 'Health' });
  await expect(health).toHaveAttribute('aria-valuenow', '75');
  await expect(health).toHaveAttribute('aria-valuemax', '100');
  await expect(page.getByRole('progressbar', { name: 'Invalid maximum' })).toHaveAttribute(
    'aria-valuenow',
    '0',
  );
  const fractional = page.getByRole('progressbar', { name: 'Fractional' });
  await expect(fractional).toHaveAttribute('aria-valuenow', '75.6');
  await expect(fractional).toHaveAttribute('aria-valuemax', '100.4');
  await expect(fractional).toHaveAttribute('aria-valuetext', '76 / 100');
  await expect(page.getByText('76 / 100', { exact: true })).toBeVisible();
});

test('performance and volume labels round without changing their underlying values', async ({
  page,
}) => {
  await page.goto(story('components-game-patterns--performance'));
  await expect(page.getByLabel('Frame rate', { exact: true })).toHaveText('60 FPS');
  await expect(page.getByLabel('Server latency', { exact: true })).toHaveText('33 ms');
  await page.goto(story('components-game-patterns--settings'));
  const volume = page.getByRole('slider', { name: 'Effects volume' });
  await volume.focus();
  await page.keyboard.press('ArrowRight');
  await expect(volume).toHaveAttribute('aria-valuenow', '0.65');
  await expect(volume).toHaveAttribute('aria-valuetext', '65%');
  await expect(page.getByText('65%', { exact: true })).toBeVisible();
});
