import { test, expect } from './fixtures';
import { INNKEEPER, itemPrice, LOOT_ITEM_IDS } from '../packages/core/src/index.ts';

test('Marta sells bottles and announces refreshed stock in yellow system chat', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await page.getByLabel('Your adventurer name').fill('Bottle buyer');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByLabel('World chat')).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => {
    return world.players.size;
  })!;
  const player = [...world.players.values()][0];
  player.coins = 10;
  const marta = world.npcs!.find((npc) => {
    return npc.id === INNKEEPER.id;
  })!;
  const trader = page.getByRole('dialog', { name: INNKEEPER.name });
  await expect(async () => {
    Object.assign(player, { x: marta.x, y: marta.y - 15 });
    await page.keyboard.press('e');
    await expect(trader).toBeVisible({ timeout: 1000 });
  }).toPass({ intervals: [200], timeout: 6000 });
  const bottle = trader.getByRole('button', { name: 'Buy Empty bottle (200)', exact: true });
  await expect(bottle).toBeVisible();
  const bottleImage = bottle.locator('img');
  await expect(bottleImage).toHaveAttribute('src', '/assets/wardrobe-style/empty-bottle.png');
  await expect
    .poll(() => {
      return bottleImage.evaluate((image: HTMLImageElement) => {
        return image.naturalWidth;
      });
    })
    .toBeGreaterThan(0);
  await bottle.hover();
  await expect(page.getByRole('tooltip')).toContainText('Resource');
  await expect(page.getByRole('tooltip')).toContainText('Quantity200');
  await expect(page.getByRole('tooltip')).toContainText('1 gold each');
  await expect(page.getByRole('tooltip')).toContainText('Right-click: buy');
  await page.screenshot({ path: 'test-results/empty-bottle-trading.png' });
  await bottle.click({ button: 'right' });
  await expect(
    trader.getByRole('button', { name: 'Buy Empty bottle (199)', exact: true }),
  ).toBeVisible();
  expect(player.coins).toBe(9);
  expect(
    player.backpack!.find((item) => {
      return item.itemId === 'empty-bottle';
    })!.quantity,
  ).toBe(1);
  world.merchant!.refreshAt = Date.now() - 1;
  await expect(bottle).toBeVisible();
  const notice = page
    .getByRole('log')
    .getByText('System: Marta the Innkeeper has refreshed her stock.', { exact: true });
  await expect(notice).toBeVisible();
  await expect(notice).toHaveCSS('color', 'rgb(244, 211, 94)');
});

test('Bram sells gear with the shared controls, stops for trading and keeps buyback separate from Marta', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Inventory', exact: true })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => {
    return world.players.size;
  })!;
  const player = [...world.players.values()][0];
  const bram = world.npcs!.find((npc) => {
    return npc.id === 'craftsman';
  })!;
  Object.assign(bram, { x: 1000, y: 1000 });
  Object.assign(player, { x: 1000, y: 985, coins: 1000 });
  await page.mouse.move(0, 0);
  await expect(page.locator('canvas[aria-label]')).toHaveAttribute(
    'data-interaction-prompt',
    bram.name,
  );
  await page.keyboard.press('e');
  const trader = page.getByRole('dialog', { name: bram.name });
  await expect(trader).toBeVisible();
  await expect
    .poll(() => {
      return bram.moving;
    })
    .toBe(false);
  Object.assign(
    world.npcs!.find((npc) => {
      return npc.id === 'innkeeper';
    })!,
    { x: 1020, y: 1000 },
  );
  const stock = trader.getByRole('region', { name: "Craftsman's backpack" });
  await expect(stock.locator('[data-backpack-item]')).toHaveCount(LOOT_ITEM_IDS.length);
  expect(
    world.merchant!.backpack.map((item) => {
      return item.itemId;
    }),
  ).toEqual(['health-potion', 'empty-bottle']);
  const gear = world.merchant!.craftsman!.backpack[0];
  const price = itemPrice(gear);
  const buy = stock.locator(`[data-backpack-item='${gear.id}']`);
  await buy.hover();
  await expect(page.getByRole('tooltip')).toContainText(`${price} gold`);
  await buy.focus();
  await page.keyboard.press('Enter');
  await expect
    .poll(() => {
      return player.coins;
    })
    .toBe(1000 - price);
  const owned = trader
    .getByRole('region', { name: 'Your backpack' })
    .locator('[data-backpack-item]');
  await expect(owned).toHaveCount(1);
  await owned.dragTo(stock, { targetPosition: { x: 12, y: 12 } });
  await expect
    .poll(() => {
      return player.coins;
    })
    .toBe(1000);
  await trader.getByRole('tab', { name: 'Buyback', exact: true }).click();
  const buyback = trader
    .getByRole('region', { name: 'Buyback', exact: true })
    .locator('[data-backpack-item]');
  await expect(buyback).toHaveCount(1);
  expect(world.merchant!.buyback).toHaveLength(0);
  await buyback.click({ button: 'right' });
  await expect
    .poll(() => {
      return player.coins;
    })
    .toBe(1000 - price);
  await trader.getByRole('button', { name: 'Sell all', exact: true }).click();
  await expect
    .poll(() => {
      return player.backpack!.length;
    })
    .toBe(0);
  await expect
    .poll(() => {
      return player.coins;
    })
    .toBe(1000);
});
