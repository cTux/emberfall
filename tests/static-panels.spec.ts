import { test, expect } from './fixtures';

test('memoized panels keep local tabs, preferences and HUD actions live during snapshots', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
  await settings.getByLabel('Auto-attack (F)', { exact: true }).uncheck();
  await settings.getByRole('tab', { name: 'Graphics', exact: true }).click();
  await settings.getByRole('button', { name: 'Low', exact: true }).click();
  await expect(settings.getByRole('button', { name: 'Low', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const world = [...game.runtime.worlds.values()].find((entry) => {
    return entry.players.size;
  })!;
  [...world.players.values()][0].name = 'Snapshot while settings open';
  await expect(page.locator('.party')).toContainText('Snapshot while settings open');
  await expect(settings.getByRole('tab', { name: 'Graphics', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('button', { name: 'Close Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await settings.getByRole('tab', { name: 'Gameplay', exact: true }).click();
  await expect(settings.getByLabel('Auto-attack (F)', { exact: true })).not.toBeChecked();
  await page.getByRole('button', { name: 'Close Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Codex', exact: true }).click();
  const codex = page.getByRole('dialog', { name: 'Codex', exact: true });
  const last = codex.getByRole('tab').last();
  await last.click();
  await expect(last).toHaveAttribute('aria-selected', 'true');
  await page.screenshot({ path: 'test-results/static-panels-desktop.png' });
  await page.getByRole('button', { name: 'Close Codex', exact: true }).click();
  await page.getByRole('button', { name: 'Inventory', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Inventory', exact: true })).toBeVisible();
});
