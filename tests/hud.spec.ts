import { test, expect } from './fixtures';

import { drag } from './hud.fixture.ts';

import './hud-codex.cases.ts';
import './hud-window-state.cases.ts';
test('performance overlay stays compact and draggable with both traces enabled', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Your adventurer name').fill('Compact hero');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  for (const name of ['FPS graph', 'Latency graph']) {
    await page.getByRole('switch', { name, exact: true }).check();
  }

  await page.getByRole('button', { name: 'Close Settings' }).click();
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  const panel = page.locator('.performance-stats');
  await expect(panel.locator('[data-series]')).toHaveCount(4);
  await expect(panel.getByLabel('Frame rate', { exact: true })).not.toHaveText('— FPS');
  const bounds = (await panel.boundingBox())!;
  expect(bounds.width).toBe(224);
  expect(bounds.height).toBeLessThanOrEqual(100);
  await drag(page, panel, 100, 40);
  await expect(panel).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 100, 40)');
  await page.screenshot({ path: 'test-results/compact-performance-desktop.png' });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('switch', { name: 'FPS graph', exact: true }).uncheck();
  await page.getByRole('button', { name: 'Close Settings' }).click();
  await expect(panel.locator('[data-series="fps"]')).toHaveCount(0);
  await expect(panel.locator('[data-series="latency"]')).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('switch', { name: 'Latency graph', exact: true }).uncheck();
  await page.getByRole('button', { name: 'Close Settings' }).click();
  await expect(panel).toBeHidden();
});

test('optional HUD widgets start centered without moving party frames', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Your adventurer name').fill('Centered hero');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  const party = page.locator('.party');
  await expect(party).toBeVisible();
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const original = await party.boundingBox();
    for (const name of ['DPS meter', 'FPS graph', 'Latency graph']) {
      await page.keyboard.press('Escape');
      await page.getByRole('switch', { name, exact: true }).check();
      await page.getByRole('button', { name: 'Close Settings' }).click();
      const panel =
        name === 'DPS meter'
          ? page.getByLabel('Damage per second', { exact: true })
          : page.locator('.performance-stats');
      await expect(panel).toBeVisible();
      await expect
        .poll(() => {
          return party.boundingBox();
        })
        .toEqual(original);
      await expect
        .poll(async () => {
          const box = (await panel.boundingBox())!;

          return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        })
        .toEqual({ x: viewport.width / 2, y: viewport.height / 2 });
      await page.screenshot({ path: `test-results/centered-${name}-${viewport.width}.png` });
      await page.keyboard.press('Escape');
      await page.getByRole('switch', { name, exact: true }).uncheck();
      await page.getByRole('button', { name: 'Close Settings' }).click();
      await expect
        .poll(() => {
          return party.boundingBox();
        })
        .toEqual(original);
    }
  }
});
