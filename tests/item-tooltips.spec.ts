import { test, expect } from './fixtures';

test('backpack item tooltips share weapon details and compact resource cards', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await page.getByLabel('Your adventurer name').fill('Tooltip tester');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Inventory' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  player.backpack = [
    { id: 'sword', itemId: 'warrior-sword', quantity: 1 },
    { id: 'amulet', itemId: 'loot-amulet', quantity: 1, stats: { expIncrease: 20 } },
    { id: 'log', itemId: 'log', quantity: 12 },
    { id: 'herb', itemId: 'flowering-herb', quantity: 8 },
  ];
  player.equipment = { weapon: 'warrior-sword', amulet: 'loot-amulet' };
  player.equipmentItems = {
    amulet: { id: 'old-amulet', itemId: 'loot-amulet', quantity: 1, stats: { goldIncrease: 10 } },
  };
  await page.keyboard.press('i');
  const backpack = page.getByRole('region', { name: 'Your backpack' });
  await backpack.getByRole('button', { name: 'Use Amulet', exact: true }).hover();
  const comparison = page.getByRole('tooltip').filter({ hasText: 'vs equipped Amulet' });
  await expect(comparison).toContainText('Exp increase+20%');
  await expect(comparison).toContainText('Gold increase-10%');
  await expect(comparison).not.toContainText('Bonus');
  for (const [name, quantity] of [
    ['Log', 12],
    ['Flowering herb', 8],
  ] as const) {
    await backpack.getByRole('button', { name: `Use ${name} (${quantity})` }).hover();
    const tooltip = page.getByRole('tooltip').filter({ hasText: name });
    await expect(tooltip).toContainText('Resource');
    await expect(tooltip).toContainText(`Quantity${quantity}`);
    await expect(tooltip).toContainText('1 gold each');
    await expect(tooltip).not.toContainText('Right-click:');
    await expect(tooltip).not.toContainText('vs equipped');
    expect((await tooltip.locator('.MuiTooltip-tooltip').boundingBox())!.height).toBeLessThan(150);
    await page.screenshot({
      path: `test-results/item-tooltip-${name.toLowerCase().replaceAll(' ', '-')}.png`,
    });
  }
  const sword = backpack.getByRole('button', { name: "Use Warrior's sword", exact: true });
  await page.keyboard.press('Tab');
  await sword.focus();
  const tooltip = page.getByRole('tooltip').filter({ hasText: "Warrior's sword" });
  await expect(tooltip).toContainText('Right-click: equip');
  await expect(tooltip.getByRole('button', { name: 'Power: 5', exact: true })).toBeVisible();
  const range = tooltip.getByRole('button', { name: 'Range: 75 units', exact: true });
  await page.keyboard.press('Tab');
  await expect(tooltip.getByRole('button', { name: 'Power: 5', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(range).toBeFocused();
  await expect(page.getByRole('tooltip').last()).toContainText('Attack range: 75 units');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(sword).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Inventory', exact: true })).toHaveCount(0);
});
