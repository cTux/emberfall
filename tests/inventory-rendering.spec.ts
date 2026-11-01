import { test, expect } from './fixtures';

test('unrelated snapshots skip inventory formatting and changed items still refresh', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await page.getByRole('button', { name: 'Inventory', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Inventory', exact: true });
  await expect(dialog.locator('[data-equipment-slot]')).toHaveCount(9);
  const world = [...game.runtime.worlds.values()].find((entry) => {
    return entry.players.size;
  })!;
  const player = [...world.players.values()][0];
  await page.evaluate(() => {
    const original = Object.getOwnPropertyDescriptor(Number.prototype, 'toLocaleString')!
      .value as typeof Number.prototype.toLocaleString;
    Object.assign(window, { inventoryFormatting: 0 });
    Number.prototype.toLocaleString = function (...args: Parameters<typeof original>) {
      if (args[1]?.maximumFractionDigits === 2) {
        const counter = window as unknown as { inventoryFormatting: number };
        counter.inventoryFormatting++;
      }

      return original.apply(this, args);
    };
  });
  player.name = 'Snapshot arrived';
  await expect(page.locator('.party')).toContainText('Snapshot arrived');
  expect(
    await page.evaluate(() => {
      return (window as unknown as { inventoryFormatting: number }).inventoryFormatting;
    }),
  ).toBe(0);
  player.backpack = [{ id: 'new-stack', itemId: 'health-potion', quantity: 2 }];
  await expect(dialog.getByRole('button', { name: 'Use Health potion (2)' })).toBeVisible();
});
