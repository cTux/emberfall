import { test, expect } from '@playwright/test';
import { story } from './ui.fixture.ts';

import './ui-actions.cases.ts';
import './ui-equipment-details.cases.ts';
import './ui-storage.cases.ts';
import './ui-windows.cases.ts';
import './ui-party.cases.ts';
import './ui-diagnostics.cases.ts';
import './ui-screens.cases.ts';
import './ui-talents.cases.ts';
import './ui-item-details.cases.ts';
test('ability tooltips round fractional cooldowns to one decimal place', async ({ page }) => {
  await page.goto(story('components-actionbar--fractional-cooldowns'));
  await page.getByRole('group', { name: 'Slash', exact: true }).focus();
  await expect(page.getByRole('tooltip')).toContainText('Cooldown: 5.7 seconds');
  await page.getByRole('button', { name: 'Choose ability for slot 1: Mending Seed' }).focus();
  await expect(page.getByRole('tooltip', { name: /Mending Seed/ })).toContainText(
    'Cooldown: 5.7 seconds',
  );
  await page.screenshot({ path: 'test-results/fractional-cooldown-tooltip.png' });
});
