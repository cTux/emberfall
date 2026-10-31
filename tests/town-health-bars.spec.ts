import { test, expect } from './fixtures';
import { LOBBY_PORTAL, starterEquipment } from '../packages/core/src/index.ts';

test.use({ graphicsPreset: 'Low' });

test('town health bars default hidden, toggle live, persist and stay visible in forest', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  player.classId = 'druid';
  player.equipment = starterEquipment('druid');
  await expect.poll(() => player.bear?.maxHitpoints).toBeGreaterThan(0);
  const canvas = page.locator('canvas');
  const openSettings = () => page.getByRole('button', { name: 'Settings', exact: true }).click();
  const closeSettings = () => page.getByRole('button', { name: 'Close Settings' }).click();
  const toggle = page.getByRole('switch', { name: 'Hide health bars in town', exact: true });
  // Count actual rendered health-fill pixels, rather than a diagnostic setting flag.
  const healthPixels = async () => {
    const png = (await canvas.screenshot()).toString('base64');

    return page.evaluate(async (png) => {
      const image = new Image();
      image.src = `data:image/png;base64,${png}`;
      await image.decode();
      const capture = document.createElement('canvas');
      capture.width = image.width;
      capture.height = image.height;
      const ctx = capture.getContext('2d')!;
      ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, capture.width, capture.height).data;
      let count = 0;
      for (let i = 0; i < pixels.length; i += 4)
        if (pixels[i] === 134 && pixels[i + 1] === 217 && pixels[i + 2] === 162) count++;

      return count;
    }, png);
  };

  await openSettings();
  await expect(toggle).toBeChecked();
  await closeSettings();
  await expect.poll(healthPixels).toBe(0);
  await page.screenshot({ path: 'test-results/town-health-hidden.png' });
  await openSettings();
  await toggle.uncheck();
  await closeSettings();
  await expect.poll(healthPixels).toBeGreaterThan(100);
  await page.screenshot({ path: 'test-results/town-health-visible.png' });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  await expect.poll(healthPixels).toBeGreaterThan(100);
  await openSettings();
  await expect(toggle).not.toBeChecked();
  await toggle.check();
  await closeSettings();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  await expect.poll(healthPixels).toBe(0);
  const activePlayer = [...world.players.values()][0];
  activePlayer.x = LOBBY_PORTAL.x;
  activePlayer.y = LOBBY_PORTAL.y - 15;
  const portal = page.getByRole('dialog', { name: 'Forest portal' });
  await expect(async () => {
    await page.keyboard.press('e');
    await expect(portal).toBeVisible();
  }).toPass({ intervals: [200], timeout: 6000 });
  await portal.getByRole('button', { name: 'Create', exact: true }).click();
  await portal.getByRole('button', { name: "I'm ready" }).click();
  await expect(page.getByLabel('Forest combat scene.')).toBeVisible({ timeout: 10000 });
  await expect.poll(healthPixels).toBeGreaterThan(100);
  await page.screenshot({ path: 'test-results/town-health-forest.png' });
});
