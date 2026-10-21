import { test, expect } from './fixtures';

test('DPS meter toggles independently of performance graphs and persists across reloads', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const meter = page.getByLabel('Damage per second', { exact: true });
  await expect(meter).toBeVisible();
  const openSettings = () => page.getByRole('button', { name: 'Settings', exact: true }).click();
  const closeSettings = () => page.getByRole('button', { name: 'Close Settings' }).click();
  const toggle = page.getByRole('switch', { name: 'DPS meter', exact: true });
  await openSettings();
  await expect(toggle).toBeChecked();
  await page.getByRole('switch', { name: 'FPS graph', exact: true }).uncheck();
  await page.getByRole('switch', { name: 'Latency graph', exact: true }).uncheck();
  await closeSettings();
  await expect(meter).toBeVisible();
  await openSettings();
  await toggle.uncheck();
  await closeSettings();
  await expect(meter).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  await expect(meter).toHaveCount(0);
  await page.setViewportSize({ width: 480, height: 800 });
  await openSettings();
  await expect(toggle).not.toBeChecked();
  await toggle.check();
  await page.screenshot({ path: 'test-results/dps-meter-settings-narrow.png' });
  await closeSettings();
  await expect(meter).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  await expect(meter).toBeVisible();
  await openSettings();
  await expect(toggle).toBeChecked();
  await closeSettings();
});
