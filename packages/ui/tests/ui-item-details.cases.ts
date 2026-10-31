import { test, expect } from '@playwright/test';
import { story } from './ui.fixture.ts';

test('compact consumable tooltip shows its effect, stack and contextual action', async ({
  page,
}) => {
  await page.goto(story('components-backpack--stacked'));
  const potion = page.getByRole('button', { name: 'Use Health potion (5)' });
  await potion.focus();
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toContainText('Consumable');
  await expect(tooltip).toContainText('Restores 25 health');
  await expect(tooltip).toContainText('Quantity5');
  await expect(tooltip).toContainText('1 gold each');
  await expect(tooltip).toContainText('Right-click: use');
  await expect(tooltip).not.toContainText('Your class cannot equip this item.');
  expect((await tooltip.locator('.MuiTooltip-tooltip').boundingBox())!.width).toBeLessThanOrEqual(
    250,
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(tooltip).toBeVisible();
  await page.screenshot({ path: 'test-results/item-tooltip-consumable.png' });
});

test('incompatible gear explains its restriction in red on hover and keyboard focus', async ({
  page,
}) => {
  await page.goto(story('components-backpack--restricted-gear'));
  const item = page.getByRole('button', { name: "Use Warrior's sword" });
  await item.hover();
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip.getByText('Your class cannot equip this item.')).toHaveCSS(
    'color',
    'rgb(239, 155, 133)',
  );
  await expect(tooltip).not.toContainText('Right-click: equip');
  await page.mouse.move(0, 0);
  await expect(tooltip).toBeHidden();
  await item.focus();
  await expect(tooltip.getByText('Your class cannot equip this item.')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(tooltip).toBeVisible();
});

test('item tooltips show quantity only for stackable items, including stacks of one', async ({
  page,
}) => {
  await page.goto(story('components-backpack--single'));
  await page.getByRole('button', { name: 'Use Health potion', exact: true }).focus();
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toContainText('Quantity1');
  await expect(tooltip).toContainText('1 gold each');

  await page.goto(story('components-equipmentpanel--rarities'));
  await page.getByRole('button', { name: 'Inspect Example weapon', exact: true }).first().hover();
  await expect(tooltip).toContainText('Example weapon');
  await expect(tooltip).not.toContainText('Quantity');
  await expect(tooltip).toContainText('1 gold');
  await expect(tooltip).not.toContainText('gold each');
  await page.screenshot({ path: 'test-results/item-tooltip-unstackable.png' });
});

test('repeated stat labels open only their own explanation', async ({ page }) => {
  await page.goto(story('components-backpack--repeated-stats'));
  await page.getByRole('button', { name: 'Use Amulet', exact: true }).focus();
  await expect(page.getByRole('button', { name: 'Power: 5', exact: true })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByText('Base weapon power.', { exact: true })).toBeVisible();
  await expect(page.getByText('Additional rolled power.', { exact: true })).not.toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByText('Additional rolled power.', { exact: true })).toBeVisible();
  await expect(page.getByText('Base weapon power.', { exact: true })).not.toBeVisible();
});

test('unequipped gear shows compact signed gains and losses with keyboard access', async ({
  page,
}) => {
  await page.goto(story('components-backpack--comparison'));
  await page.getByRole('button', { name: 'Use Amulet', exact: true }).focus();
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).not.toContainText('Bonus');
  await expect(tooltip).not.toContainText('vs equipped');
  await expect(tooltip).not.toContainText('Armor');
  await expect(tooltip.getByText('Exp increase', { exact: true })).toHaveCount(1);
  await expect(tooltip.getByText('+20%', { exact: true })).toHaveCount(1);
  await expect(tooltip).toContainText('Exp increase+20%');
  await expect(tooltip).toContainText('Gold increase-10%');
  await expect(tooltip.getByText('+20%', { exact: true }).last()).toHaveCSS(
    'color',
    'rgb(131, 203, 163)',
  );
  expect((await tooltip.locator('.MuiTooltip-tooltip').boundingBox())!.width).toBeLessThanOrEqual(
    250,
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await tooltip.screenshot({ path: 'test-results/item-stat-comparison.png' });
  await page.goto(story('components-backpack--same-stats'));
  await page.getByRole('button', { name: 'Use Amulet', exact: true }).focus();
  await expect(page.getByRole('tooltip')).toContainText('Same stats');
  await expect(page.getByRole('tooltip')).not.toContainText('Exp increase');
  await expect(page.getByRole('tooltip')).not.toContainText('vs equipped');
});
