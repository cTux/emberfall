import { test, expect } from './fixtures';
import { LOBBY_PORTAL } from '../packages/core/src/index.ts';

test('unlabeled village portal keeps its interaction prompt and window', async ({ page, game }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => {
    return world.players.size;
  })!;
  const player = [...world.players.values()][0];
  player.x = LOBBY_PORTAL.x;
  player.y = LOBBY_PORTAL.y + 45;
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-interaction-prompt', 'Portal');
  await canvas.screenshot({ path: 'test-results/village-portal-no-label.png' });
  await page.keyboard.press('e');
  await expect(page.getByRole('dialog', { name: 'Portal' })).toBeVisible();
});
