import { test, expect } from './fixtures';

test('DOT Speed gear equips, shows its bonus and survives reload', async ({ page, game }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Inventory' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => {
    return world.players.size;
  })!;
  const player = [...world.players.values()][0];
  player.backpack = [
    {
      id: 'dot-speed-sword',
      itemId: 'warrior-sword',
      quantity: 1,
      rarity: 'common',
      stats: { dotSpeed: 2 },
    },
  ];
  await page.keyboard.press('i');
  const inventory = page.getByRole('dialog', { name: 'Inventory', exact: true });
  const item = inventory.locator('[data-backpack-item=dot-speed-sword]');
  await item.hover();
  await expect(page.getByRole('tooltip').first()).toContainText('DOT Speed');
  await expect(page.getByRole('tooltip').first()).not.toContainText('Bonus');
  await expect(page.getByRole('tooltip').first()).toContainText('+2%');
  await item.click({ button: 'right' });
  await expect
    .poll(() => {
      return player.equipmentItems?.weapon?.stats?.dotSpeed;
    })
    .toBe(2);
  await inventory.getByRole('tab', { name: 'Stats', exact: true }).click();
  await expect(inventory).toContainText('DOT Speed');
  await expect(inventory).toContainText('2%');
  await page.screenshot({ path: 'test-results/dot-speed-stats.png' });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Inventory' })).toBeVisible();
  await page.keyboard.press('i');
  await inventory.getByRole('tab', { name: 'Stats', exact: true }).click();
  await expect(inventory).toContainText('DOT Speed');
  await expect(inventory).toContainText('2%');
});
