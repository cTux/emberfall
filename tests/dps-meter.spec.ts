import { test, expect } from './fixtures';

test('DPS meter toggles independently of performance graphs and persists across reloads', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const meter = page.getByLabel('Damage per second', { exact: true });
  await expect(meter).toHaveCount(0);
  await expect(page.getByLabel('Performance monitor', { exact: true })).toHaveCount(0);
  const openSettings = () => page.getByRole('button', { name: 'Settings', exact: true }).click();
  const closeSettings = () => page.getByRole('button', { name: 'Close Settings' }).click();
  const toggle = page.getByRole('switch', { name: 'DPS meter', exact: true });
  await openSettings();
  await expect(toggle).not.toBeChecked();
  for (const name of ['FPS graph', 'Latency graph'])
    await expect(page.getByRole('switch', { name, exact: true })).not.toBeChecked();
  await toggle.check();
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
