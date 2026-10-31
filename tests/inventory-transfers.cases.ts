import { test, expect } from './fixtures';
import { INNKEEPER } from '../packages/core/src/index.ts';

test('inventory equips, unequips and consumes stacks; shared trading transfers items and gold', async ({
  page,
  game,
  browser,
  baseURL,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    return errors.push(error.message);
  });
  await page.goto('/');
  await page.getByLabel('Your adventurer name').fill('Seller');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Inventory' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => {
    return world.players.size;
  })!;
  const player = [...world.players.values()][0];
  player.backpack = [
    { id: 'helmet', itemId: 'loot-helmet', quantity: 1 },
    { id: 'potion', itemId: 'health-potion', quantity: 3 },
  ];
  player.coins = 0;
  player.hitpoints = 60;
  await page.keyboard.press('i');
  const inventory = page.getByRole('dialog', { name: 'Inventory', exact: true });
  await expect(inventory).toBeVisible();
  const backpack = inventory.getByRole('region', { name: 'Your backpack' });
  await expect(backpack.getByRole('button', { name: 'Use Health potion (3)' })).toBeVisible();
  const potionIcon = backpack.getByRole('button', { name: 'Use Health potion (3)' }).locator('img');
  await expect(potionIcon).toHaveAttribute('src', '/assets/wardrobe-style/health-potion.png');
  await expect(potionIcon).toHaveJSProperty('naturalWidth', 96);
  await backpack.getByRole('button', { name: 'Use Helmet', exact: true }).hover();
  const tooltip = page.getByRole('tooltip').filter({ hasText: 'Helmet' });
  await expect(tooltip).toContainText('1Armor');
  await expect(tooltip).toContainText('1 gold');
  await expect(tooltip).toContainText('Right-click: equip');
  await page.screenshot({ path: 'test-results/item-tooltip-armor.png' });
  await backpack.getByRole('button', { name: 'Use Health potion (3)' }).hover();
  const potionTooltip = page.getByRole('tooltip').filter({ hasText: 'Health potion' });
  await expect(potionTooltip).toContainText('Consumable');
  await expect(potionTooltip).toContainText('Restores 25 health');
  await expect(potionTooltip).toContainText('Quantity3');
  await expect(potionTooltip).toContainText('Right-click: use');
  await page.screenshot({ path: 'test-results/item-tooltip-consumable.png' });
  await backpack
    .getByRole('button', { name: 'Use Helmet', exact: true })
    .click({ button: 'right' });
  await expect(
    inventory.getByRole('button', { name: 'Helmet: Helmet', exact: true }),
  ).toBeVisible();
  await inventory.getByRole('tab', { name: 'Stats', exact: true }).click();
  await expect(inventory.getByRole('region', { name: 'Character stats' })).toContainText('Armor1');
  await inventory.getByRole('tab', { name: 'Equipment', exact: true }).click();
  expect(player.equipment!.helmet).toBe('loot-helmet');
  await inventory
    .getByRole('button', { name: 'Helmet: Helmet', exact: true })
    .click({ button: 'right' });
  await expect(backpack.getByRole('button', { name: 'Use Helmet', exact: true })).toBeVisible();
  await inventory.getByRole('tab', { name: 'Stats', exact: true }).click();
  await expect(inventory.getByRole('region', { name: 'Character stats' })).toContainText('Armor0');
  await inventory.getByRole('tab', { name: 'Equipment', exact: true }).click();
  await inventory.locator('[data-equipment-slot="weapon"]').click({ button: 'right' });
  await expect(inventory.getByRole('button', { name: 'Weapon: Empty', exact: true })).toBeVisible();
  await backpack.getByRole('button', { name: "Use Warrior's sword", exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(
    inventory.getByRole('button', { name: "Weapon: Warrior's sword", exact: true }),
  ).toBeVisible();
  await backpack.getByRole('button', { name: 'Use Health potion (3)' }).click({ button: 'right' });
  await expect(backpack.getByRole('button', { name: 'Use Health potion (2)' })).toBeVisible();
  expect(player.hitpoints).toBe(85);
  await page.screenshot({ path: 'test-results/inventory-desktop.png' });
  await page.setViewportSize({ width: 1024, height: 800 });
  await expect(inventory).toBeVisible();
  expect(
    await inventory.evaluate((node) => {
      return node.scrollWidth <= node.clientWidth;
    }),
  ).toBe(true);
  await page.screenshot({ path: 'test-results/inventory-narrow.png' });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.keyboard.press('Escape');
  const marta = world.npcs!.find((npc) => {
    return npc.id === INNKEEPER.id;
  })!;
  Object.assign(marta, { x: 1000, y: 1000 });
  const trader = page.getByRole('dialog', { name: INNKEEPER.name });
  await expect(async () => {
    player.x = marta.x;
    player.y = marta.y - 15;
    await page.keyboard.press('e');
    await expect(trader).toBeVisible({ timeout: 1000 });
  }).toPass({ intervals: [200], timeout: 6000 });
  await expect(trader.getByLabel("Innkeeper's backpack: 5000 coins")).toBeVisible();

  for (const width of [1280, 883]) {
    await page.setViewportSize({ width, height: 800 });

    for (const tab of ['Buyback', 'Buy']) {
      await trader.getByRole('tab', { name: tab, exact: true }).click();
      const merchantSlots = trader
        .getByRole('region', {
          name: tab === 'Buy' ? "Innkeeper's backpack" : 'Buyback',
          exact: true,
        })
        .locator('button');
      const playerSlots = trader
        .getByRole('region', { name: 'Your backpack' })
        .locator('[data-backpack-item], button[aria-hidden="true"]');

      for (let index = 0; index < 20; index++) {
        const left = (await merchantSlots.nth(index).boundingBox())!;
        const right = (await playerSlots.nth(index).boundingBox())!;
        expect(Math.abs(left.y - right.y)).toBeLessThan(1);
        expect(Math.abs(left.width - left.height)).toBeLessThan(1);
        expect(Math.abs(left.width - right.width)).toBeLessThan(1);
      }

      if (width > 320) {
        const window = (await trader.locator('.game-window-surface').boundingBox())!;
        const first = (await merchantSlots.first().boundingBox())!;
        const last = (await playerSlots.last().boundingBox())!;
        const padding = first.x - window.x;
        // Fixed 44px slots leave 5px of horizontal slack inside the 520px window.
        expect(
          Math.abs(window.x + window.width - last.x - last.width - padding),
        ).toBeLessThanOrEqual(5);
        expect(Math.abs(window.y + window.height - last.y - last.height - padding)).toBeLessThan(1);
      }
    }

    await page.screenshot({ path: `test-results/innkeeper-aligned-${width}.png` });
  }

  await page.setViewportSize({ width: 1280, height: 800 });
  await trader.getByRole('button', { name: 'Sell Helmet', exact: true }).click({ button: 'right' });
  await expect(trader.getByRole('button', { name: 'Buy Helmet', exact: true })).toHaveCount(0);
  await trader.getByRole('tab', { name: 'Buyback', exact: true }).click();
  await expect(trader.getByRole('button', { name: 'Buy back Helmet', exact: true })).toBeVisible();
  await expect(trader.getByLabel('Your backpack: 1 coins')).toBeVisible();
  expect(world.merchant!.coins).toBe(4999);
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  try {
    const secondPage = await context.newPage();
    await secondPage.bringToFront();
    await secondPage.goto(baseURL!);
    await secondPage.getByLabel('Your adventurer name').fill('Buyer');
    await secondPage.getByRole('button', { name: /^Join Playtest Default/ }).click();
    await expect(secondPage.getByRole('button', { name: 'Inventory' })).toBeVisible();
    const buyer = [...world.players.values()].find((p) => {
      return p.name === 'Buyer';
    })!;
    buyer.x = marta.x;
    buyer.y = marta.y - 15;
    buyer.coins = 1;
    await expect(secondPage.getByLabel('Buyer: 1 coins')).toBeVisible();
    await secondPage.locator('canvas').click({ position: { x: 5, y: 5 } });
    // Keep the pointer near the teleported buyer rather than over distant scenery.
    const canvas = (await secondPage.locator('canvas').boundingBox())!;
    await secondPage.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
    const secondTrader = secondPage.getByRole('dialog', { name: INNKEEPER.name });
    await expect(async () => {
      await secondPage.keyboard.press('e');
      await expect(secondTrader).toBeVisible();
    }).toPass({ intervals: [200], timeout: 6000 });
    await secondTrader.getByRole('tab', { name: 'Buyback', exact: true }).click();
    await secondTrader
      .getByRole('button', { name: 'Buy back Helmet', exact: true })
      .click({ button: 'right' });
    await expect(
      secondTrader.getByRole('button', { name: 'Sell Helmet', exact: true }),
    ).toBeVisible();
    await expect(trader.getByRole('button', { name: 'Buy back Helmet', exact: true })).toHaveCount(
      0,
    );
    expect(buyer.coins).toBe(0);
    expect(world.merchant!.coins).toBe(5000);
    await secondTrader.getByRole('tab', { name: 'Buy', exact: true }).click();
    // Rejected purchase keeps the stock and both balances.
    await secondTrader
      .getByRole('button', { name: 'Buy Health potion (5)' })
      .click({ button: 'right' });
    await expect(secondPage.getByRole('log', { name: 'Latest chat messages' })).toContainText(
      'Not enough gold',
    );
    expect(world.merchant!.backpack[0].quantity).toBe(5);
    await page.screenshot({ path: 'test-results/innkeeper-trading.png' });
    // Moving away rejects an action even if the trader window remains open.
    buyer.x = 2400;
    buyer.y = 1280;
    await secondTrader
      .getByRole('button', { name: 'Sell Helmet', exact: true })
      .click({ button: 'right' });
    await expect(secondPage.getByRole('log', { name: 'Latest chat messages' })).toContainText(
      'Trade near Marta',
    );
    expect(buyer.backpack!.length).toBe(1);
  } finally {
    await context.close();
  }

  await page.bringToFront();
  player.backpack = Array.from({ length: 24 }, (_, index) => {
    return {
      id: `bulk-${index}`,
      itemId: 'loot-boots',
      quantity: 1,
    };
  });
  player.backpack.push({ id: 'bulk-potions', itemId: 'health-potion', quantity: 3 });
  await expect(trader.getByRole('button', { name: 'Sell Boots', exact: true })).toHaveCount(24);
  await expect(trader.getByRole('button', { name: 'Sell all', exact: true })).toBeEnabled();
  await page.screenshot({ path: 'test-results/innkeeper-before-sell-all.png' });
  const oldCoins = player.coins;
  await trader.getByRole('button', { name: 'Sell all', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(trader.getByRole('button', { name: 'Sell all', exact: true })).toBeDisabled();
  expect(player.backpack).toEqual([]);
  expect(player.coins).toBe(oldCoins + 27);
  expect(world.merchant!.buyback).toHaveLength(20);
  const buyback = trader.getByRole('region', { name: 'Buyback', exact: true });
  await expect(buyback.locator('[data-backpack-item]')).toHaveCount(20);
  await expect(buyback.getByRole('button', { name: 'Buy back Health potion (3)' })).toBeVisible();
  await page.screenshot({ path: 'test-results/innkeeper-buyback-desktop.png' });
  await page.setViewportSize({ width: 320, height: 800 });
  await expect(trader).toBeVisible();
  expect(
    await trader.evaluate((node) => {
      return node.scrollWidth <= node.clientWidth;
    }),
  ).toBe(true);
  await trader.getByRole('button', { name: 'Buy back Health potion (3)' }).focus();
  await page.keyboard.press('Enter');
  await expect(
    trader.getByRole('button', { name: 'Sell Health potion', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: 'test-results/innkeeper-buyback-narrow.png' });
  expect(errors).toEqual([]);
});
