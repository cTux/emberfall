import { test, expect } from './fixtures';
import { BUILDINGS, WARDROBE } from '../packages/common/src/index.ts';

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
  player.coins = 13;
  const dialog = page.getByRole('dialog', { name: 'Storehouse', exact: true });
  await expect(async () => {
    await page.keyboard.press('e');
    await expect(dialog).toBeVisible();
  }).toPass({ intervals: [200], timeout: 6000 });
  await expect(dialog.getByRole('tab')).toHaveCount(3);
  await expect(dialog.getByLabel('Storehouse: 13 coins', { exact: true })).toBeVisible();
  const gold = (await dialog.getByLabel('Storehouse: 13 coins', { exact: true }).boundingBox())!;
  const firstSlot = (await dialog.getByRole('tabpanel').locator('button').first().boundingBox())!;
  expect(firstSlot.y - (gold.y + gold.height)).toBeLessThanOrEqual(8);
  await expect
    .poll(() =>
      dialog
        .locator('.MuiDialogContent-root')
        .evaluate((element) => element.scrollHeight - element.clientHeight),
    )
    .toBeLessThanOrEqual(1);
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
  await expect(rename.locator('.game-window-surface')).toBeVisible();
  expect((await rename.boundingBox())!.width).toBeLessThanOrEqual(280);
  expect((await rename.boundingBox())!.height).toBeLessThan(180);
  await rename.getByRole('textbox', { name: 'Storage name' }).fill('   ');
  await expect(rename.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
  await rename.getByRole('textbox').fill('');
  await expect(rename.getByPlaceholder('Storage name')).toBeVisible();
  await expect(rename.getByText('1–24 characters')).toHaveCount(0);
  await page.screenshot({
    path: 'test-results/storage-rename-desktop.png',
    animations: 'disabled',
  });
  const longName = 'Potions and equipment for the next forest adventure '.repeat(100).trim();
  await rename.getByRole('textbox').fill(longName);
  await rename.getByRole('textbox').press('Enter');
  const longTab = dialog.getByRole('tab', { name: longName, exact: true });
  await expect(longTab).toBeVisible();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const label = longTab.locator('.MuiTypography-root');
    await expect(label).toHaveCSS('text-overflow', 'ellipsis');
    expect(await label.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
    await longTab.click({ button: 'right' });
    await rename.getByRole('textbox').fill('');
    await page.screenshot({
      path: `test-results/storage-rename-${width}.png`,
      animations: 'disabled',
    });
    await rename.getByRole('button', { name: 'Cancel', exact: true }).click();
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await longTab.click({ button: 'right' });
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
  await dialog
    .getByRole('button', { name: 'Deposit Health potion (5)' })
    .click({ button: 'right' });
  await expect(dialog.getByRole('button', { name: 'Withdraw Health potion (5)' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Close Storehouse' }).click();
  player.x = WARDROBE.x;
  player.y = WARDROBE.y - 15;
  const wardrobe = page.getByRole('dialog', { name: 'Wardrobe', exact: true });
  await expect(async () => {
    if (await dialog.isVisible())
      await dialog.getByRole('button', { name: 'Close Storehouse' }).click();
    await page.keyboard.press('e');
    await expect(wardrobe).toBeVisible({ timeout: 400 });
  }).toPass({ intervals: [200], timeout: 6000 });
  await wardrobe.getByRole('button', { name: /^Mage/ }).click();
  await expect.poll(() => player.classId).toBe('mage');
  expect(player.coins).toBe(13);
  expect(player.backpack).toHaveLength(0);
  await wardrobe.getByRole('button', { name: 'Close Wardrobe' }).click();
  player.x = building.doorX;
  player.y = building.y + 9;
  await expect(async () => {
    if (await wardrobe.isVisible())
      await wardrobe.getByRole('button', { name: 'Close Wardrobe' }).click();
    await page.keyboard.press('e');
    await expect(dialog).toBeVisible({ timeout: 400 });
  }).toPass({ intervals: [200], timeout: 6000 });
  await expect(dialog.getByLabel('Storehouse: 13 coins', { exact: true })).toBeVisible();
  await dialog.getByRole('tab', { name: 'Potions', exact: true }).click();
  await dialog
    .getByRole('button', { name: 'Withdraw Health potion (5)' })
    .click({ button: 'right' });
  await expect(dialog.getByRole('button', { name: 'Deposit Health potion (5)' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  expect([...world.players.values()][0].storages![2].name).toBe('Potions');
  expect([...world.players.values()][0].backpack![0].quantity).toBe(5);
  expect([...world.players.values()][0].coins).toBe(13);
  expect(errors).toEqual([]);
});
