import { test, expect } from './fixtures';
import { BUILDINGS, FOREST, wrappedDelta } from '../packages/core/src/index.ts';

test('clicking the unlabelled Storehouse opens storage rather than the services placeholder', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => {
    return world.players.size;
  })!;
  const player = [...world.players.values()][0];
  const building = BUILDINGS.find((building) => {
    return building.id === 'storehouse';
  })!;
  player.x = building.doorX;
  player.y = building.y + 9;
  const canvas = page.locator('canvas');
  const scale = Math.max(1440 / 960, 1000 / 640);
  await expect(async () => {
    await page.mouse.move(
      720 + wrappedDelta(building.x, player.x, FOREST.width) * scale,
      500 + wrappedDelta(building.y - 40, player.y, FOREST.height) * scale,
    );
    await expect(canvas).toHaveAttribute('data-interaction-target', 'storehouse');
    await expect(canvas).toHaveAttribute('data-interaction-range', 'true');
  }).toPass();
  await page.mouse.down();
  await page.mouse.up();
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog.locator('h2')).toHaveText('Storehouse');
  await expect(dialog.locator('[role="tab"]')).toHaveCount(3);
  await expect(dialog.locator('section[aria-label="Storage 1"] button')).toHaveCount(40);
  await expect(dialog).not.toContainText('services are coming');
  await page.screenshot({ path: 'test-results/storehouse-hover.png' });
});
