import { test, expect } from './fixtures';
import { crittersAt } from '../packages/client/src/critter-motion.ts';
import { wrappedDelta, FOREST } from '../packages/core/src/index.ts';

test.use({ graphicsPreset: 'Low' });

test('pet cats with clicks and E, respect range and cooldown, and keep speech above moving cats', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((w) => {
    return w.players.size;
  })!;
  const player = [...world.players.values()][0];
  const canvas = page.locator('canvas');
  const catAt = () => {
    return crittersAt('village', Date.now(), { x: 0, y: 0, width: 960, height: 640 }).find((c) => {
      return c.id === 'cat:590:470';
    })!;
  };

  const hoverCat = async (inRange: boolean) => {
    await expect(async () => {
      const cat = catAt();
      await page.mouse.move(
        720 + wrappedDelta(cat.x, player.x, FOREST.width) * 1.5625,
        500 + wrappedDelta(cat.y - 5, player.y, FOREST.height) * 1.5625,
      );
      await expect(canvas).toHaveAttribute('data-interaction-target', cat.id, { timeout: 250 });
      await expect(canvas).toHaveAttribute('data-interaction-range', String(inRange), {
        timeout: 250,
      });
    }).toPass();
  };

  player.x = 590;
  player.y = 570;
  await hoverCat(false);
  await page.mouse.down();
  await page.mouse.up();
  await page.keyboard.press('e');
  await expect(canvas).toHaveAttribute('data-cat-speech', '');
  player.y = 485;
  await expect(async () => {
    await hoverCat(true);
    await page.mouse.down();
    await page.mouse.up();
    await expect(canvas).toHaveAttribute('data-cat-speech', 'Purrr', { timeout: 250 });
  }).toPass();
  await page.keyboard.press('e');
  await expect(canvas).toHaveAttribute('data-cat-speech', 'Purrr');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('log').locator('div').filter({ hasText: 'Cat: Purrr' })).toHaveCount(
    1,
  );
  await page.screenshot({ path: 'test-results/cat-purrr.png' });
  await expect(canvas).toHaveAttribute('data-cat-speech', '');
  await page.mouse.move(10, 10);
  await page.keyboard.press('e');
  await expect(canvas).toHaveAttribute('data-cat-speech', 'Meow');
  await expect(page.getByRole('log')).toContainText('Cat: Meow');
  await expect(page.getByRole('log')).toContainText('Cat: Purrr');
  await page.screenshot({ path: 'test-results/cat-meow.png' });
  await page.keyboard.press('Enter');
  await page.getByRole('textbox', { name: 'Chat message' }).fill('Hello cat');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('log').locator('div').last()).toContainText('Hello cat');
  await expect(page.getByRole('log')).toContainText('Cat: Meow');
  await page.getByRole('button', { name: 'Leave world' }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  await expect(page.getByRole('log')).not.toContainText('Cat:');
});
