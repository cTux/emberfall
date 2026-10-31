import { test, expect } from './fixtures';
import { LOBBY_PORTAL, WARDROBE, BUILDINGS } from '../packages/core/src/index.ts';

test('collected gold credits the account Storehouse across classes and rejoining', async ({
  page,
  game,
}, testInfo) => {
  await page.goto('/');
  await page.getByLabel('Your adventurer name').fill('Coin hero');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  const card = page.getByRole('article', { name: 'Coin hero', exact: true });
  await expect(card.getByLabel('Coin hero: 0 coins', { exact: true })).toHaveText('0');
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  player.x = LOBBY_PORTAL.x;
  player.y = LOBBY_PORTAL.y - 15;
  const portal = page
    .getByRole('dialog')
    .filter({ has: page.getByRole('heading', { name: 'Forest portal', exact: true }) });
  await expect(async () => {
    await page.keyboard.press('e');
    await expect(portal).toBeVisible();
  }).toPass({ intervals: [200], timeout: 6000 });
  await portal.getByRole('button', { name: 'Create', exact: true }).click();
  await portal.getByRole('button', { name: "I'm ready" }).click();
  await expect(page.getByLabel('Forest combat scene.')).toBeVisible({ timeout: 10000 });
  player.coins = 999;
  game.runtime.parties(world).run([...world.players.values()][0]).scene!.drops = [
    {
      id: ++game.runtime.parties(world).run([...world.players.values()][0]).scene!.sequence,
      kind: 'gold',
      x: player.x,
      y: player.y,
      at: Date.now() - 300,
    },
  ];
  await expect(card.getByLabel('Coin hero: 1000 coins', { exact: true })).toHaveText('1k');
  expect(player.coins).toBe(1000);
  expect(game.runtime.parties(world).run([...world.players.values()][0]).scene!.drops).toHaveLength(
    0,
  );
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({ path: testInfo.outputPath(`coins-forest-${width}.png`) });
  }

  await page.getByRole('button', { name: 'Leave world' }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByLabel('Shared village. Move with WASD or arrow keys.')).toBeVisible();
  player.x = WARDROBE.x;
  player.y = WARDROBE.y - 15;
  const wardrobe = page.getByRole('dialog', { name: 'Wardrobe', exact: true });
  await expect(async () => {
    await page.keyboard.press('e');
    await expect(wardrobe).toBeVisible();
  }).toPass({ intervals: [200], timeout: 6000 });
  await wardrobe.getByRole('button', { name: /^Ranger/ }).click();
  await expect.poll(() => player.classId).toBe('ranger');
  await wardrobe.getByRole('button', { name: 'Close Wardrobe' }).click();
  await expect(card.getByLabel('Coin hero: 1000 coins', { exact: true })).toHaveText('1k');
  const building = BUILDINGS.find((building) => building.id === 'storehouse')!;
  player.x = building.doorX;
  player.y = building.y + 9;
  const storehouse = page.getByRole('dialog', { name: 'Storehouse', exact: true });
  await expect(async () => {
    if (await wardrobe.isVisible())
      await wardrobe.getByRole('button', { name: 'Close Wardrobe' }).click();
    await page.keyboard.press('e');
    await expect(storehouse).toBeVisible({ timeout: 400 });
  }).toPass({ intervals: [200], timeout: 6000 });
  await expect(storehouse.getByLabel('Storehouse: 1000 coins', { exact: true })).toHaveText('1k');
  await page.screenshot({ path: testInfo.outputPath('account-storehouse-gold.png') });
  await storehouse.getByRole('button', { name: 'Close Storehouse' }).click();
  await page.getByRole('button', { name: 'Leave world' }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(card.getByLabel('Coin hero: 1000 coins', { exact: true })).toHaveText('1k');
  await page.screenshot({ path: testInfo.outputPath('coins-restored-village.png') });
});
