import { test, expect } from './fixtures';

import './equipment-interactions.cases.ts';
test('inventory tabs preserve the bag, aligned square gear and calculated stat totals', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Inventory' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => {
    return world.players.size;
  })!;
  const player = [...world.players.values()][0];
  player.classId = 'druid';
  player.equipment = {
    weapon: 'druid-staff',
    helmet: 'loot-helmet',
    amulet: 'loot-amulet',
    bodyArmor: 'loot-bodyArmor',
    offHand: 'loot-natureFocus',
    gloves: 'loot-gloves',
    leggings: 'loot-leggings',
    ring: 'loot-ring',
    boots: 'loot-boots',
  };
  player.equipmentItems = {
    helmet: {
      id: 'rolled-helmet',
      itemId: 'loot-helmet',
      quantity: 1,
      rarity: 'rare',
      stats: { criticalChance: 2.8, criticalDamage: 14 },
    },
  };
  player.coins = 914;
  await page.keyboard.press('i');
  const dialog = page.getByRole('dialog', { name: 'Inventory', exact: true });
  const equipment = dialog.getByRole('tab', { name: 'Equipment', exact: true });
  const statsTab = dialog.getByRole('tab', { name: 'Stats', exact: true });
  const bag = dialog.getByRole('region', { name: 'Your backpack' });
  await expect(equipment).toHaveAttribute('aria-selected', 'true');
  const surface = (await dialog.locator('.game-window-surface').boundingBox())!;

  for (const tab of [equipment, statsTab]) {
    const box = (await tab.boundingBox())!;
    expect(box.x + box.width).toBeLessThan(surface.x);
  }

  const positions = {
    helmet: [2, 1],
    amulet: [3, 1],
    weapon: [1, 2],
    bodyArmor: [2, 2],
    offHand: [3, 2],
    gloves: [1, 3],
    leggings: [2, 3],
    ring: [3, 3],
    boots: [2, 4],
  };

  for (const width of [1440, 1024]) {
    await page.setViewportSize({ width, height: 1000 });
    const bagBox = (await bag.locator('button').first().boundingBox())!;
    expect(bagBox.width).toBe(44);
    const origin = (await dialog.locator('[data-equipment-slot=helmet]').boundingBox())!;

    for (const [id, [column, row]] of Object.entries(positions)) {
      const box = (await dialog.locator(`[data-equipment-slot=${id}]`).boundingBox())!;
      expect(box.width).toBe(50);
      expect(box.height).toBe(box.width);
      expect(box.x - origin.x).toBeCloseTo((column - 2) * (box.width + 4), 1);
      expect(box.y - origin.y).toBeCloseTo((row - 1) * (box.height + 4), 1);
    }
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.mouse.move(0, 0);
  await page.screenshot({ path: 'test-results/inventory-equipment-tabs.png' });
  const bagBox = await bag.boundingBox();
  const equipmentSurface = await dialog.locator('.game-window-surface').boundingBox();
  await equipment.focus();
  await page.keyboard.press('ArrowDown');
  await expect(statsTab).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(statsTab).toHaveAttribute('aria-selected', 'true');
  await expect(dialog.getByRole('button', { name: /^Helmet:/ })).toHaveCount(0);
  const stats = dialog.getByRole('region', { name: 'Character stats' });
  await expect(stats).toContainText('Critical chance7.8%');
  await expect(stats).toContainText('Critical damage164%');
  await expect(stats).not.toContainText('Bonus');
  await expect(bag).toBeVisible();
  const after = (await bag.boundingBox())!;
  expect(after.x).toBe(bagBox!.x);
  expect(after.width).toBe(bagBox!.width);
  expect(after.y).toBe(bagBox!.y);
  expect(after.height).toBe(bagBox!.height);
  expect(await dialog.locator('.game-window-surface').boundingBox()).toEqual(equipmentSurface);
  await page.mouse.move(0, 0);
  await page.screenshot({ path: 'test-results/inventory-stats-tabs.png' });
  await page.keyboard.press('ArrowUp');
  await expect(equipment).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dialog.locator('[data-equipment-slot]')).toHaveCount(9);
  expect(await dialog.locator('.game-window-surface').boundingBox()).toEqual(equipmentSurface);
  await dialog.locator('[data-equipment-slot=helmet]').click({ button: 'right' });
  await statsTab.click();
  await expect(stats).toContainText('Critical chance5%');
  await expect(stats).toContainText('Critical damage150%');
  await expect(bag.getByRole('button', { name: 'Use Helmet', exact: true })).toBeVisible();
});
