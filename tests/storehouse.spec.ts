import { test, expect } from './fixtures';
import { BUILDINGS } from '../packages/common/src/index.ts';

test('Storehouse has three renameable 40-slot tabs and transfers saved stacks', async ({
  page,
  game,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  const building = BUILDINGS.find((building) => building.id === 'storehouse')!;
  player.x = building.doorX;
  player.y = building.y + 9;
  player.backpack = [{ id: 'test-potions', itemId: 'health-potion', quantity: 5 }];
  const dialog = page.getByRole('dialog', { name: 'Storehouse', exact: true });
  await expect(async () => {
    await page.keyboard.press('e');
    await expect(dialog).toBeVisible();
  }).toPass({ intervals: [200], timeout: 6000 });
  await expect(dialog.getByRole('tab')).toHaveCount(3);
  for (let tab = 1; tab <= 3; tab++) {
    await dialog.getByRole('tab', { name: `Storage ${tab}`, exact: true }).click();
    await expect(
      dialog.getByRole('region', { name: `Storage ${tab}`, exact: true }).locator('button'),
    ).toHaveCount(40);
  }
  await dialog
    .getByRole('button', { name: 'Deposit Health potion (5)' })
    .click({ button: 'right' });
  await expect(dialog.getByRole('button', { name: 'Withdraw Health potion (5)' })).toBeVisible();
  expect(player.storages![2].items[0].quantity).toBe(5);
  await dialog.getByRole('tab', { name: 'Storage 3', exact: true }).click({ button: 'right' });
  const rename = page.getByRole('dialog', { name: 'Rename storage' });
  await rename.getByRole('textbox', { name: 'Storage name' }).fill('   ');
  await expect(rename.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
  await rename.getByRole('textbox', { name: 'Storage name' }).fill(' Potions ');
  await rename.getByRole('textbox').press('Enter');
  await expect(dialog.getByRole('tab', { name: 'Potions', exact: true })).toBeVisible();
  const tab = dialog.getByRole('tab', { name: 'Potions', exact: true });
  await tab.focus();
  await tab.press('F2');
  await rename.getByRole('textbox').fill('Cancelled');
  await rename.getByRole('textbox').press('Escape');
  await expect(rename).toBeHidden();
  await expect(dialog).toBeVisible();
  await expect(tab).toBeFocused();
  await page.screenshot({ path: 'test-results/storehouse-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/storehouse-narrow.png' });
  const bounds = await dialog.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  const scroll = await dialog
    .locator('.MuiDialogContent-root')
    .first()
    .evaluate((element) => ({ width: element.clientWidth, scroll: element.scrollWidth }));
  expect(scroll.scroll).toBeLessThanOrEqual(scroll.width);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await dialog.getByRole('button', { name: 'Withdraw Health potion (5)' }).focus();
  await page.keyboard.press('Enter');
  await expect(dialog.getByRole('button', { name: 'Deposit Health potion (5)' })).toBeVisible();
  expect(player.storages![2].items).toHaveLength(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  expect([...world.players.values()][0].storages![2].name).toBe('Potions');
  expect([...world.players.values()][0].backpack![0].quantity).toBe(5);
  expect(errors).toEqual([]);
});
