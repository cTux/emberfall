import { test, expect } from './fixtures';
import { starterEquipment } from '../packages/core/src/index.ts';

test('Tactics uses external left tabs, saves priorities and companion controls, and respects keyboard boundaries', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await page.getByLabel('Your adventurer name').fill('Tactician');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((entry) => entry.players.size)!;
  const player = [...world.players.values()][0];
  const controls = page.getByRole('navigation', { name: 'Game controls' });
  await expect(controls.locator('kbd')).toHaveText(['I', 'N', 'T', 'F1', 'Esc']);
  const window = page.getByRole('dialog', { name: 'Tactics', exact: true });
  await page.keyboard.press('Enter');
  const chat = page.getByRole('textbox', { name: 'Chat message', exact: true });
  await expect(chat).toBeFocused();
  await chat.press('t');
  await expect(window).toBeHidden();
  await chat.press('Escape');
  await page.keyboard.press('Control+t');
  await expect(window).toBeHidden();
  await page.keyboard.down('t');
  await expect(window).toBeVisible();
  await page.keyboard.down('t');
  await expect(window).toBeVisible();
  await page.keyboard.up('t');
  const tabs = window.getByRole('tablist', { name: 'Tactics sections' });
  await expect(tabs.getByRole('tab')).toHaveText(['Offensive', 'Defensive', 'Positioning']);
  const tabBox = (await tabs.boundingBox())!;
  const panelBox = (await window.locator('.game-window-surface').boundingBox())!;
  expect(tabBox.x + tabBox.width).toBeLessThan(panelBox.x);
  await window.evaluate((element) => {
    element.querySelector<HTMLInputElement>('input[role="switch"]')!.click();
    element
      .querySelector<HTMLButtonElement>('button[aria-label="Move Elite / boss first up"]')!
      .click();
    element
      .querySelector<HTMLButtonElement>('button[aria-label="Move Elite / boss first up"]')!
      .click();
  });
  await expect.poll(() => player.tactics?.offensive).toEqual(['elite', 'nearest', 'lowestHealth']);
  await expect.poll(() => player.tactics?.keepTarget).toBe(true);
  await expect(
    window.getByRole('switch', { name: 'Keep target until defeated or invalid' }),
  ).toBeChecked();
  await page.screenshot({ path: 'test-results/tactics-offensive.png' });
  await window.getByRole('tab', { name: 'Defensive' }).click();
  await window.getByRole('combobox', { name: 'Auto-heal below' }).click();
  await page.getByRole('option', { name: '50% HP' }).click();
  await expect.poll(() => player.tactics?.healBelow).toBe(0.5);
  await page.screenshot({ path: 'test-results/tactics-defensive.png' });
  await window.getByRole('tab', { name: 'Positioning' }).click();
  await expect(window.getByRole('combobox', { name: 'Combat stance' })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  await expect(window).toContainText('Your current class has no companion');
  Object.assign(player, {
    classId: 'druid',
    equipment: starterEquipment('druid'),
    tactics: undefined,
  });
  await expect(window.getByRole('combobox', { name: 'Combat stance' })).not.toHaveAttribute(
    'aria-disabled',
    'true',
  );
  await window.getByRole('combobox', { name: 'Combat stance' }).click();
  await page.getByRole('option', { name: 'Passive', exact: true }).click();
  await expect.poll(() => player.tactics?.stance).toBe('passive');
  await window.getByRole('combobox', { name: 'Stay near owner' }).click();
  await page.getByRole('option', { name: 'Far · 300 units' }).click();
  await expect.poll(() => player.tactics?.distance).toBe('far');
  await page.screenshot({ path: 'test-results/tactics-positioning.png' });
  await page.keyboard.press('Escape');
  await expect(window).toBeHidden();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  await page.keyboard.press('t');
  await window.getByRole('tab', { name: 'Positioning' }).click();
  await expect(window.getByRole('combobox', { name: 'Combat stance' })).toHaveText('Passive');
  await expect(window.getByRole('combobox', { name: 'Stay near owner' })).toHaveText(
    'Far · 300 units',
  );
  await page.keyboard.press('t');
  await expect(window).toBeHidden();
});
