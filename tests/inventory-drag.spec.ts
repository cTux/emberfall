import { test, expect } from './fixtures';
import { BUILDINGS, INNKEEPER } from '../packages/common/src/index.ts';

test('native drags deposit, move between storage tabs and withdraw; full and same-inventory drops preserve items', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  const building = BUILDINGS.find((building) => building.id === 'storehouse')!;
  player.x = building.doorX;
  player.y = building.y + 9;
  player.backpack = [{ id: 'drag-potions', itemId: 'health-potion', quantity: 5 }];
  const dialog = page.getByRole('dialog', { name: 'Storehouse', exact: true });
  await expect(async () => {
    await page.keyboard.press('e');
    await expect(dialog).toBeVisible();
  }).toPass({ intervals: [200], timeout: 6000 });
  const backpack = dialog.getByRole('region', { name: 'Your backpack' });
  const first = dialog.getByRole('region', { name: 'Storage 1', exact: true });
  await backpack
    .getByRole('button', { name: 'Deposit Health potion (5)' })
    .dragTo(first, { targetPosition: { x: 12, y: 12 } });
  await expect(first.getByRole('button', { name: 'Withdraw Health potion (5)' })).toBeVisible();
  expect(player.backpack).toHaveLength(0);
  const potion = first.getByRole('button', { name: 'Withdraw Health potion (5)' });
  await potion.dragTo(first, { targetPosition: { x: 12, y: 12 } });
  await expect(potion).toBeVisible();
  expect(player.storages![0].items).toHaveLength(1);
  await potion.dragTo(dialog.getByRole('tab', { name: 'Storage 2', exact: true }));
  const second = dialog.getByRole('region', { name: 'Storage 2', exact: true });
  await expect(second.getByRole('button', { name: 'Withdraw Health potion (5)' })).toBeVisible();
  expect(player.storages![0].items).toHaveLength(0);
  expect(player.storages![1].items[0].quantity).toBe(5);
  await second
    .getByRole('button', { name: 'Withdraw Health potion (5)' })
    .dragTo(backpack, { targetPosition: { x: 12, y: 12 } });
  await expect(backpack.getByRole('button', { name: 'Deposit Health potion (5)' })).toBeVisible();
  await backpack
    .getByRole('button', { name: 'Deposit Health potion (5)' })
    .dragTo(dialog.getByRole('tab', { name: 'Storage 3', exact: true }));
  const third = dialog.getByRole('region', { name: 'Storage 3', exact: true });
  await expect(third.getByRole('button', { name: 'Withdraw Health potion (5)' })).toBeVisible();
  player.backpack = Array.from({ length: 20 }, (_, index) => ({
    id: `full-${index}`,
    itemId: 'loot-helmet',
    quantity: 1,
  }));
  await expect(backpack.locator('[data-backpack-item]')).toHaveCount(20);
  await third
    .getByRole('button', { name: 'Withdraw Health potion (5)' })
    .dragTo(backpack, { targetPosition: { x: 12, y: 12 } });
  await page.screenshot({ path: 'test-results/inventory-drag-storehouse.png' });
  await dialog.getByRole('button', { name: 'Close Storehouse' }).click();
  await expect(page.getByRole('alert')).toContainText('full');
  expect(player.storages![2].items[0].quantity).toBe(5);
  expect(player.backpack).toHaveLength(20);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  expect([...world.players.values()][0].storages![2].items[0].quantity).toBe(5);
});

test('native vendor drags buy and sell once, including buyback, without bypassing gold checks', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  player.x = INNKEEPER.x;
  player.y = INNKEEPER.y + 35;
  player.backpack = [{ id: 'drag-helmet', itemId: 'loot-helmet', quantity: 1 }];
  player.coins = 0;
  const dialog = page.getByRole('dialog', { name: INNKEEPER.name, exact: true });
  await expect(async () => {
    await page.keyboard.press('e');
    await expect(dialog).toBeVisible({ timeout: 400 });
  }).toPass({ intervals: [200], timeout: 10000 });
  const merchant = dialog.getByRole('region', { name: "Innkeeper's backpack" });
  const backpack = dialog.getByRole('region', { name: 'Your backpack' });
  await merchant
    .getByRole('button', { name: 'Buy Health potion (5)' })
    .dragTo(backpack, { targetPosition: { x: 12, y: 12 } });
  await dialog.getByRole('button', { name: `Close ${INNKEEPER.name}` }).click();
  await expect(page.getByRole('alert')).toContainText('Not enough gold');
  expect(player.coins).toBe(0);
  expect(world.merchant!.backpack[0].quantity).toBe(5);
  await page.keyboard.press('e');
  await expect(dialog).toBeVisible();
  await backpack
    .getByRole('button', { name: 'Sell Helmet', exact: true })
    .dragTo(merchant, { targetPosition: { x: 12, y: 12 } });
  await expect.poll(() => player.coins).toBe(1);
  await expect(backpack.locator('[data-backpack-item]')).toHaveCount(0);
  await merchant
    .getByRole('button', { name: 'Buy Health potion (5)' })
    .dragTo(backpack, { targetPosition: { x: 12, y: 12 } });
  await expect(
    backpack.getByRole('button', { name: 'Sell Health potion', exact: true }),
  ).toBeVisible();
  expect(player.coins).toBe(0);
  expect(world.merchant!.backpack[0].quantity).toBe(4);
  await dialog.getByRole('tab', { name: 'Buyback', exact: true }).click();
  const buyback = dialog.getByRole('region', { name: 'Buyback', exact: true });
  await backpack
    .getByRole('button', { name: 'Sell Health potion', exact: true })
    .dragTo(buyback, { targetPosition: { x: 12, y: 12 } });
  await expect.poll(() => player.coins).toBe(1);
  await buyback
    .getByRole('button', { name: 'Buy back Helmet', exact: true })
    .dragTo(backpack, { targetPosition: { x: 12, y: 12 } });
  await expect(backpack.getByRole('button', { name: 'Sell Helmet', exact: true })).toBeVisible();
  expect(player.coins).toBe(0);
  expect(world.merchant!.coins).toBe(5000);
  await page.screenshot({ path: 'test-results/inventory-drag-vendor.png' });
});
