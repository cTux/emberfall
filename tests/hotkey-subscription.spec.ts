import { test, expect } from './fixtures';

test('snapshots retain keyboard subscriptions and shortcuts read the current menu and focus', async ({
  page,
  game,
}) => {
  await page.addInitScript(() => {
    const counts = { adds: 0, removes: 0 };
    Object.assign(window, { keySubscriptions: counts });
    const add = Object.getOwnPropertyDescriptor(EventTarget.prototype, 'addEventListener')!
      .value as EventTarget['addEventListener'];
    const remove = Object.getOwnPropertyDescriptor(EventTarget.prototype, 'removeEventListener')!
      .value as EventTarget['removeEventListener'];
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (this === window && type === 'keydown') {
        counts.adds++;
      }

      return add.call(this, type, listener, options);
    };

    EventTarget.prototype.removeEventListener = function (type, listener, options) {
      if (this === window && type === 'keydown') {
        counts.removes++;
      }

      return remove.call(this, type, listener, options);
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('region', { name: 'Action bar', exact: true })).toBeVisible();
  const readCounts = () => {
    return page.evaluate(() => {
      return (window as unknown as { keySubscriptions: { adds: number; removes: number } })
        .keySubscriptions;
    });
  };

  const before = await readCounts();
  const world = [...game.runtime.worlds.values()].find((entry) => {
    return entry.players.size;
  })!;
  [...world.players.values()][0].name = 'Hotkey snapshot';
  await expect(page.locator('.party')).toContainText('Hotkey snapshot');
  expect(await readCounts()).toEqual(before);
  const inventory = page.getByRole('dialog', { name: 'Inventory', exact: true });
  await page.keyboard.press('i');
  await expect(inventory).toBeVisible();
  await page.keyboard.press('i');
  await expect(inventory).toBeHidden();
  const talents = page.getByRole('region', { name: 'Talents', exact: true });
  await page.keyboard.press('n');
  await expect(talents).toBeVisible();
  await page.keyboard.press('n');
  await expect(talents).toBeHidden();
  await page.keyboard.press('Enter');
  const input = page.getByRole('textbox', { name: 'Chat message', exact: true });
  await expect(input).toBeFocused();
  await input.press('i');
  await expect(inventory).toBeHidden();
  await expect(input).toHaveValue('i');
  await input.press('Escape');
  await page.keyboard.press('i');
  await expect(inventory).toBeVisible();
});
