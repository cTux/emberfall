import { test, expect } from './fixtures';
import { INNKEEPER, starterEquipment } from '../packages/core/src/index.ts';

import './inventory-merchants.cases.ts';
import './inventory-transfers.cases.ts';
test('item tooltips follow class equipment rules without hiding trade actions', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await page.getByLabel('Your adventurer name').fill('Gear restrictions');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Inventory' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  player.classId = 'warrior';
  player.equipment = starterEquipment('warrior');
  player.backpack = [
    { id: 'bow', itemId: 'ranger-bow', quantity: 1 },
    { id: 'helmet', itemId: 'loot-helmet', quantity: 1 },
    { id: 'potion', itemId: 'health-potion', quantity: 1 },
    { id: 'bottle', itemId: 'empty-bottle', quantity: 1 },
  ];
  await page.keyboard.press('i');
  const backpack = page.getByRole('region', { name: 'Your backpack' });
  const bow = backpack.locator('[data-backpack-item="bow"]');
  await bow.hover();
  const tooltip = page.getByRole('tooltip').filter({ hasText: "Ranger's bow" });
  const warning = tooltip.getByText('Your class cannot equip this item.', { exact: true });
  await expect(warning).toBeVisible();
  await expect(warning).toHaveCSS('color', 'rgb(239, 155, 133)');
  await expect(tooltip).not.toContainText('Right-click: equip');
  await page.screenshot({ path: 'test-results/item-equip-restriction.png' });
  await bow.click({ button: 'right' });
  await expect(page.getByRole('log', { name: 'Latest chat messages' })).toContainText(
    'Your class cannot equip this item.',
  );
  expect(player.backpack.some((item) => item.id === 'bow')).toBe(true);
  for (const id of ['helmet', 'potion', 'bottle']) {
    await backpack.locator(`[data-backpack-item="${id}"]`).hover();
    await expect(warning).toBeHidden();
  }

  player.classId = 'ranger';
  player.equipment = starterEquipment('ranger');
  await bow.hover();
  await expect(tooltip).toContainText('Right-click: equip');
  await expect(warning).toBeHidden();
  player.classId = 'warrior';
  player.equipment = starterEquipment('warrior');
  await page.keyboard.press('Escape');
  const marta = world.npcs!.find((npc) => npc.id === INNKEEPER.id)!;
  const trader = page.getByRole('dialog', { name: INNKEEPER.name });
  await expect(async () => {
    Object.assign(player, { x: marta.x, y: marta.y - 15 });
    await page.keyboard.press('e');
    await expect(trader).toBeVisible({ timeout: 1000 });
  }).toPass({ intervals: [200], timeout: 6000 });
  await trader.locator('[data-backpack-item="bow"]').hover();
  await expect(warning).toBeVisible();
  await expect(tooltip).toContainText('Right-click: sell');
});
