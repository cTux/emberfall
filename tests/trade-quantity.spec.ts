import { test, expect } from './fixtures';
import { INNKEEPER } from '../packages/core/src/index.ts';

test('trade modifiers apply to buying, selling, buyback, keyboard and vendor drops', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  player.coins = 1000;
  player.backpack = [];
  const marta = world.npcs!.find((npc) => npc.id === INNKEEPER.id)!;
  const trader = page.getByRole('dialog', { name: INNKEEPER.name });
  await expect(async () => {
    Object.assign(player, { x: marta.x, y: marta.y - 15 });
    await page.keyboard.press('e');
    await expect(trader).toBeVisible({ timeout: 1000 });
  }).toPass({ intervals: [200], timeout: 6000 });
  const stock = trader.getByRole('region', { name: "Innkeeper's backpack", exact: true });
  const backpack = trader.getByRole('region', { name: 'Your backpack', exact: true });
  const buy = (quantity: number) =>
    stock.getByRole('button', { name: `Buy Empty bottle (${quantity})`, exact: true });
  const sell = (quantity: number) =>
    backpack.getByRole('button', { name: `Sell Empty bottle (${quantity})`, exact: true });
  await buy(200).click({ button: 'right', modifiers: ['Shift'] });
  await expect(sell(10)).toBeVisible();
  expect(player.coins).toBe(990);
  await buy(190).focus();
  await page.keyboard.press('Control+Shift+Enter');
  await expect(sell(200)).toBeVisible();
  expect(player.coins).toBe(800);
  await sell(200).click({ button: 'right', modifiers: ['Shift'] });
  await expect(sell(190)).toBeVisible();
  expect(player.coins).toBe(810);
  await sell(190).focus();
  await page.keyboard.press('Control+Space');
  await expect(sell(190)).toHaveCount(0);
  expect(player.backpack).toHaveLength(0);
  expect(player.coins).toBe(1000);
  await trader.getByRole('tab', { name: 'Buyback', exact: true }).click();
  const buyback = trader.getByRole('region', { name: 'Buyback', exact: true });
  await buyback
    .getByRole('button', { name: 'Buy back Empty bottle (190)', exact: true })
    .click({ button: 'right', modifiers: ['Control'] });
  await expect(sell(190)).toBeVisible();
  expect(player.coins).toBe(810);
  await page.keyboard.down('Shift');
  try {
    await sell(190).dragTo(buyback, { targetPosition: { x: 10, y: 10 } });
  } finally {
    await page.keyboard.up('Shift');
  }
  await expect(sell(180)).toBeVisible();
  expect(player.coins).toBe(820);
  await page.keyboard.down('Control');
  try {
    await buyback
      .getByRole('button', { name: 'Buy back Empty bottle (10)', exact: true })
      .first()
      .dragTo(backpack, { targetPosition: { x: 10, y: 10 } });
  } finally {
    await page.keyboard.up('Control');
  }
  await expect(sell(190)).toBeVisible();
  expect(player.coins).toBe(810);
  expect(world.merchant!.coins).toBe(5190);
  await page.screenshot({ path: 'test-results/trade-quantity-desktop.png' });
});
