import type { Page, Locator } from '@playwright/test';
import { expect } from './fixtures';

export async function checkWeaponBadges(page: Page, dialog: Locator) {
  const sword = dialog.getByRole('button', { name: "Weapon: Warrior's sword" });
  await page.keyboard.press('Tab');
  await sword.focus();
  const itemTooltip = page.getByRole('tooltip').filter({ hasText: "Warrior's sword" });
  await expect(itemTooltip).toBeVisible();
  expect(await itemTooltip.evaluate((node) => node.closest('[role="dialog"]') === null)).toBe(true);
  await expect(dialog.locator('.game-window-surface')).toHaveCSS('border-top-width', '1px');
  await expect(dialog.locator('.game-window-surface')).toHaveCSS('border-top-style', 'solid');
  await expect(dialog.locator('.game-window-surface')).toHaveCSS('border-image-source', 'none');
  await expect(dialog.locator('.MuiDialogTitle-root').locator('..')).toHaveCSS(
    'border-bottom-width',
    '0px',
  );
  const content = dialog.locator('.MuiDialogContent-root');
  expect(await content.evaluate((node) => node.scrollHeight <= node.clientHeight)).toBe(true);
  await expect(itemTooltip.locator('.MuiTooltip-tooltip').first()).toHaveCSS(
    'background-color',
    'rgba(0, 0, 0, 0.94)',
  );
  expect(
    (await itemTooltip.locator('.MuiTooltip-tooltip').first().boundingBox())!.width,
  ).toBeLessThanOrEqual(250);
  await expect(itemTooltip.getByRole('button', { name: 'Power: 5', exact: true })).toBeVisible();
  await expect(
    itemTooltip.getByRole('button', { name: 'Range: 75 units', exact: true }),
  ).toBeVisible();
  await expect(
    itemTooltip.getByRole('button', { name: 'Cooldown: 1 sec', exact: true }),
  ).toBeVisible();
  await expect(itemTooltip).not.toContainText('Deal 5 damage');
  const bleed = itemTooltip.getByRole('button', { name: 'Bleed', exact: true });
  await expect(bleed).toContainText('10% chance to apply Bleed');
  await expect(itemTooltip).toContainText('Right-click: unequip');
  // Tab reaches the portalled badges without leaving the modal focus scope.
  await page.keyboard.press('Tab');
  await expect(itemTooltip.getByRole('button', { name: 'Power: 5', exact: true })).toBeFocused();
  await expect(page.getByRole('tooltip').last()).toContainText('Deal 5 damage');
  await page.keyboard.press('Shift+Tab');
  await expect(sword).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(itemTooltip.getByRole('button', { name: 'Power: 5', exact: true })).toBeFocused();
  await bleed.focus();
  await bleed.hover();
  await expect(page.getByRole('tooltip').last()).toContainText('10% chance to apply Bleed');
  await page.getByRole('tooltip').last().hover();
  await expect(bleed).toBeVisible();
  await expect(page.getByRole('tooltip').last()).toContainText('new stacks refresh the duration');
  await page.screenshot({ path: 'test-results/equipment-badges-bleed.png' });
  await bleed.focus();
  await expect(bleed).toBeFocused();
  await expect(itemTooltip).toBeVisible();
  await expect(itemTooltip).not.toContainText('Attack speed');
  await expect(sword).toHaveCSS('border-top-width', '1px');
  await expect(sword).toHaveCSS('border-top-color', 'rgb(255, 255, 255)');
  return content;
}
