import { test, expect } from '@playwright/test';
import { story } from './ui.fixture.ts';

test('inventory slots stay fixed when extra stats add a scrollbar', async ({ page }, testInfo) => {
  await page.goto(story('components-backpack--inventory-stats'));
  const content = page.locator('.MuiDialogContent-root');
  const slots = page.getByRole('region', { name: 'Your backpack' }).locator('button');
  await expect(slots).toHaveCount(20);
  const expectFixedSlots = async () => {
    for (const slot of await slots.all()) {
      await expect(slot).toHaveCSS('width', '44px');
      await expect(slot).toHaveCSS('height', '44px');
    }

    expect(await content.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
  };

  await expectFixedSlots();
  expect(await content.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(
    false,
  );
  await page.getByRole('button', { name: 'Toggle extra stats' }).click();
  await expect(page.getByText('Bonus stat 15')).toBeAttached();
  expect(await content.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(
    true,
  );
  await expectFixedSlots();
  await page.screenshot({ path: testInfo.outputPath('inventory-fixed-slots.png') });
  await page.getByRole('button', { name: 'Toggle extra stats' }).click();
  await expect(page.getByText('Bonus stat 15')).toHaveCount(0);
  await expectFixedSlots();
});

test('equipment slots accept inventory drops and retain keyboard unequipping', async ({ page }) => {
  await page.goto(story('components-equipmentpanel--drag-to-equip'));
  const item = page.getByRole('button', { name: 'Use Helmet', exact: true });
  await item.dragTo(page.getByRole('button', { name: 'Boots: Empty', exact: true }));
  await expect(item).toBeVisible();
  await item.dragTo(page.getByRole('button', { name: 'Helmet: Empty', exact: true }));
  const equipped = page.getByRole('button', { name: 'Helmet: Helmet', exact: true });
  await expect(equipped).toBeVisible();
  await expect(item).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Character stats' })).toContainText('Armor1');
  await equipped.focus();
  await page.keyboard.press('Enter');
  await expect(item).toBeVisible();
});

test('backpack passes modifier keys for mouse and keyboard actions', async ({ page }) => {
  await page.goto(story('components-backpack--modifiers'));
  const potion = page.getByRole('button', { name: 'Use Health potion (5)' });
  await potion.click({ button: 'right', modifiers: ['Shift'] });
  await expect(page.getByRole('status')).toHaveText('potion: Shift=true, Ctrl=false');
  await potion.focus();
  await potion.press('Control+Shift+Enter');
  await expect(page.getByRole('status')).toHaveText('potion: Shift=true, Ctrl=true');
  await potion.press('Space');
  await expect(page.getByRole('status')).toHaveText('potion: Shift=false, Ctrl=false');
});

test('inventory dragging moves once, ignores unrelated drops and preserves keyboard actions', async ({
  page,
}) => {
  await page.goto(story('components-backpack--drag-and-drop'));
  const backpack = page.getByRole('region', { name: 'Your backpack' });
  const storage = page.getByRole('region', { name: 'Storage', exact: true });
  const potion = backpack.getByRole('button', { name: 'Use Health potion (5)' });
  await potion.dragTo(storage, { targetPosition: { x: 12, y: 12 } });
  await expect(backpack.locator('[data-backpack-item]')).toHaveCount(0);
  await expect(storage.locator('[data-backpack-item]')).toHaveCount(1);
  const unrelated = await page.evaluateHandle(() => {
    const data = new DataTransfer();
    data.setData('text/plain', 'potion');

    return data;
  });
  await backpack.dispatchEvent('drop', { dataTransfer: unrelated });
  await expect(storage.locator('[data-backpack-item]')).toHaveCount(1);
  const malformed = await page.evaluateHandle(() => {
    const data = new DataTransfer();
    data.setData('application/x-emberfall-inventory-1', 'x'.repeat(65));

    return data;
  });
  await backpack.dispatchEvent('drop', { dataTransfer: malformed });
  await expect(storage.locator('[data-backpack-item]')).toHaveCount(1);
  const stored = storage.getByRole('button', { name: 'Use Health potion (5)' });
  await stored.focus();
  await stored.press('Enter');
  await expect(potion).toBeVisible();
  await expect(storage.locator('[data-backpack-item]')).toHaveCount(0);
});

test('storage supports forty slots and optional tab rename by mouse or keyboard', async ({
  page,
}) => {
  await page.goto(story('components-backpack--storage'));
  await expect(page.getByRole('region', { name: 'Storage 1' }).locator('button')).toHaveCount(40);
  await page.goto(story('components-chaptertabs--renameable'));
  await page.getByRole('tab', { name: 'Storage 1' }).click({ button: 'right' });
  await expect(page.getByRole('tab', { name: 'Renamed storage' })).toBeVisible();
  await page.reload();
  const tab = page.getByRole('tab', { name: 'Storage 1' });
  await expect(tab).toHaveAttribute('title', 'Storage 1 · Rename (F2)');
  await tab.focus();
  await tab.press('F2');
  await expect(page.getByRole('tab', { name: 'Renamed storage' })).toBeFocused();
});

test('inventory artwork stays centered inside every filled slot', async ({ page }, testInfo) => {
  for (const state of ['stacked', 'full', 'storage', 'selling']) {
    await page.goto(story(`components-backpack--${state}`));
    const slots = page.locator('[data-backpack-item]');
    await expect(slots.first()).toBeVisible();
    for (const slot of await slots.all()) {
      const bounds = (await slot.boundingBox())!;
      const icon = (await slot.locator('img').boundingBox())!;
      expect(Math.abs(icon.x + icon.width / 2 - bounds.x - bounds.width / 2)).toBeLessThan(1);
      expect(Math.abs(icon.y + icon.height / 2 - bounds.y - bounds.height / 2)).toBeLessThan(1);
    }
  }

  await page.screenshot({ path: testInfo.outputPath('centered-inventory-icons.png') });
});

test('backpacks show twenty wood-colored slots and tabs sit outside the left window border', async ({
  page,
}) => {
  for (const state of ['empty', 'stacked', 'full']) {
    await page.goto(story(`components-backpack--${state}`));
    const slots = page.getByRole('region', { name: 'Your backpack' }).locator('button');
    await expect(slots).toHaveCount(20);
    await expect(slots.first()).toHaveCSS('border-top-color', 'rgb(135, 80, 57)');
    await expect(slots.first()).toHaveCSS('background-color', 'rgb(40, 26, 20)');
  }

  await page.goto(story('screens-compositions--settings'));
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 800 });
    const title = page.getByRole('heading', { name: 'Settings', exact: true });
    const tabs = page.getByRole('tablist');
    const heading = (await title.boundingBox())!;
    const row = (await tabs.boundingBox())!;
    await expect(tabs).toHaveAttribute('aria-orientation', 'vertical');
    const surface = page.locator('.game-window-surface');
    const box = (await surface.boundingBox())!;
    expect(row.x + row.width).toBeLessThanOrEqual(box.x);
    expect(row.x).toBeGreaterThanOrEqual(0);
    const first = (await tabs.getByRole('tab').nth(0).boundingBox())!;
    const second = (await tabs.getByRole('tab').nth(1).boundingBox())!;
    expect(second.y).toBeGreaterThanOrEqual(first.y + first.height);
    expect(row.y - heading.y - heading.height).toBeLessThanOrEqual(12);
    await expect(page.getByRole('tab', { selected: true })).toHaveCSS(
      'background-color',
      'rgb(88, 53, 36)',
    );
    await expect(title.locator('..').locator('..')).toHaveCSS(
      'border-top-color',
      'rgb(135, 80, 57)',
    );
    await page.screenshot({ path: `test-results/compact-settings-${width}.png` });
  }
});

test('backpack header action mirrors gold and works with the keyboard', async ({ page }) => {
  await page.goto(story('components-backpack--selling'));
  const action = page.getByRole('button', { name: 'Sell all', exact: true });
  const gold = page.getByLabel('Your backpack: 5000 coins');
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 800 });
    const a = (await action.boundingBox())!;
    const g = (await gold.boundingBox())!;
    expect(a.x).toBeGreaterThan(g.x + g.width);
    expect(Math.abs(a.y + a.height / 2 - g.y - g.height / 2)).toBeLessThan(2);
  }

  await action.focus();
  await page.keyboard.press('Enter');
  await expect(action).toBeDisabled();
  await expect(page.locator('[data-backpack-item]')).toHaveCount(0);
});
