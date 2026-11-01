import { test, expect } from './fixtures';
import { ANVIL, characterStats } from '../packages/core/src/index.ts';

test('anvil icon picker improves equipped and backpack gear, enforces prices and persists stars', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await page.getByLabel('Your adventurer name').fill('Smith');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Inventory', exact: true })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => {
    return world.players.size;
  })!;
  const player = [...world.players.values()][0];
  player.coins = 220;
  player.backpack = [
    { id: 'helmet', itemId: 'loot-helmet', quantity: 1 },
    { id: 'bow', itemId: 'ranger-bow', quantity: 1 },
    { id: 'potion', itemId: 'health-potion', quantity: 1 },
  ];
  const baselinePower = characterStats(player).power;
  await page.mouse.move(0, 0);
  const dialog = page.getByRole('dialog', { name: 'Smithing anvil' });
  await expect(async () => {
    Object.assign(player, { x: ANVIL!.x, y: ANVIL!.y - 15 });
    await page.keyboard.press('e');
    await expect(dialog).toBeVisible({ timeout: 1000 });
  }).toPass();
  await dialog.getByRole('button', { name: 'Choose item to improve' }).click();
  await expect(page.getByRole('menuitem')).toHaveCount(3);
  await page.getByRole('menuitem', { name: /sword.*Weapon.*0\/5 stars/i }).click();

  for (const [stars, price] of [10, 20, 30, 50, 100].entries()) {
    await dialog.getByRole('button', { name: `Improve · ${price} gold` }).click();
    await expect
      .poll(() => {
        return player.equipmentItems?.weapon?.stars;
      })
      .toBe(stars + 1);
  }

  await expect(dialog.getByText('Maximum improvement reached')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Fully improved' })).toBeDisabled();
  expect(characterStats(player).power).toBe(baselinePower * 1.5);
  expect(player.coins).toBe(10);
  await dialog.getByRole('button', { name: 'Choose item to improve' }).click();
  await page.getByRole('menuitem', { name: /helmet.*Backpack.*0\/5 stars/i }).click();
  await expect(dialog.getByLabel('Improvement stats')).toContainText('Armor: 1 → 1.1');
  await page.screenshot({ path: 'test-results/anvil-improvement.png' });
  await dialog.getByRole('button', { name: 'Improve · 10 gold' }).click();
  await expect
    .poll(() => {
      return player.backpack![0].stars;
    })
    .toBe(1);
  await expect(dialog.getByRole('button', { name: 'Improve · 20 gold' })).toBeDisabled();
  await expect(dialog.getByText('Not enough gold.')).toBeVisible();
  await page.reload();
  await expect
    .poll(() => {
      return [...world.players.values()][0]?.equipmentItems?.weapon?.stars;
    })
    .toBe(5);
  expect([...world.players.values()][0].backpack![0].stars).toBe(1);
});
