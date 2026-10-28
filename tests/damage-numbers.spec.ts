import { test, expect } from './fixtures';

test('hide other players damage numbers defaults on and persists independently of all numbers', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const open = () => page.getByRole('button', { name: 'Settings', exact: true }).click();
  const close = () => page.getByRole('button', { name: 'Close Settings' }).click();
  const hideOthers = page.getByRole('switch', {
    name: "Hide other players' damage numbers",
    exact: true,
  });
  const allNumbers = page.getByRole('switch', { name: 'Floating damage numbers', exact: true });
  await open();
  await expect(hideOthers).toBeChecked();
  await expect(allNumbers).toBeChecked();
  await hideOthers.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/damage-number-settings.png' });
  await hideOthers.uncheck();
  await allNumbers.uncheck();
  await close();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  await open();
  await expect(hideOthers).not.toBeChecked();
  await expect(allNumbers).not.toBeChecked();
  await allNumbers.check();
  await hideOthers.check();
  await close();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  await open();
  await expect(hideOthers).toBeChecked();
  await expect(allNumbers).toBeChecked();
});
