import { test, expect } from '@playwright/test';
import { story } from './ui.fixture.ts';

test('ability tooltips share window surfaces and support hover, keyboard and touch', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(story('components-gamewindow--playground'));
  await expect(page.locator('.game-window-surface')).toHaveCSS(
    'font-family',
    '"Alegreya Sans", sans-serif',
  );
  const surface = await page.locator('.game-window-surface').evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      background: style.backgroundColor,
      border: style.borderTop,
      radius: style.borderRadius,
      color: style.color,
      font: style.fontFamily,
    };
  });
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 700 });
    await page.goto(story('components-actionbar--cooling-down'));
    const ability = page.getByRole('group', { name: 'Slash', exact: true });
    await ability.hover();
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toContainText('Slash');
    await expect(tooltip).toContainText('Cooldown: 1 second');
    await expect(tooltip).toContainText('Auto-fire: On (F)');
    await expect(tooltip).toContainText('Auto-target: On (G)');
    await expect(tooltip.locator('.MuiTooltip-tooltip')).toHaveCSS(
      'background-color',
      surface.background,
    );
    await expect(tooltip.locator('.MuiTooltip-tooltip')).toHaveCSS('border-top', surface.border);
    await expect(tooltip.locator('.MuiTooltip-tooltip')).toHaveCSS('border-radius', surface.radius);
    await expect(tooltip.locator('.MuiTooltip-tooltip')).toHaveCSS('color', surface.color);
    await expect(tooltip.locator('.MuiTooltip-tooltip')).toHaveCSS('font-family', surface.font);
    const box = (await tooltip.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `test-results/ability-tooltip-${width}.png` });
    await page.keyboard.press('Escape');
    await expect(tooltip).toBeHidden();
    await page.mouse.move(width - 1, 699);
    await page.keyboard.press('Tab');
    await expect(ability).toBeFocused();
    await expect(tooltip).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(tooltip).toBeHidden();
  }
  await page.goto(story('components-actionbar--manual'));
  const ability = page.getByRole('group', { name: 'Slash', exact: true });
  await ability.dispatchEvent('touchstart', { touches: [{ identifier: 1 }] });
  await expect(page.getByRole('tooltip')).toContainText('Auto-fire: Off (F)');
  await ability.dispatchEvent('touchend', { touches: [] });
  await page.goto(story('components-actionbar--unequipped'));
  await page.getByRole('group', { name: 'Empty ability slot 1', exact: true }).hover();
  await expect(page.getByRole('tooltip')).toHaveCount(0);
});

test.describe('equipment touch badges', () => {
  test.use({ hasTouch: true, viewport: { width: 320, height: 800 } });
  test('tap opens the item and an effect explanation', async ({ page }) => {
    await page.goto(story('components-equipmentpanel--starter'));
    await page.getByRole('button', { name: "Weapon: Warrior's sword" }).tap();
    const bleed = page.getByRole('button', { name: 'Bleed', exact: true });
    await expect(bleed).toBeVisible();
    await bleed.tap();
    await expect(page.getByRole('tooltip').last()).toContainText('10% chance to apply Bleed');
  });
});

test('equipment rarity colors appear in slot borders and tooltip labels', async ({ page }) => {
  await page.goto(story('components-equipmentpanel--rarities'));
  const colors = [
    ['common', 'rgb(255, 255, 255)'],
    ['uncommon', 'rgb(30, 255, 0)'],
    ['rare', 'rgb(0, 112, 221)'],
    ['epic', 'rgb(163, 53, 238)'],
    ['legendary', 'rgb(255, 128, 0)'],
  ];
  for (const [rarity, color] of colors) {
    const item = page.locator(`[data-rarity=${rarity}]`);
    await expect(item).toHaveCSS('border-top-color', color);
    await item.hover();
    await expect(
      page.getByRole('tooltip').filter({ hasText: rarity[0].toUpperCase() + rarity.slice(1) }),
    ).toBeVisible();
  }
});

test('equipment exposes rarity borders, keyboard details and desktop stats', async ({ page }) => {
  await page.goto(story('components-equipmentpanel--starter'));
  await expect(page.locator('[data-equipment-slot]')).toHaveCount(9);
  const weapon = page.getByRole('button', { name: "Weapon: Warrior's sword" });
  await weapon.focus();
  await expect(
    page.getByRole('tooltip').getByRole('button', { name: 'Critical chance: 5%', exact: true }),
  ).toBeVisible();
  await expect(weapon).toHaveCSS('border-top-width', '1px');
  await expect(weapon).toHaveCSS('border-top-color', 'rgb(255, 255, 255)');
  await weapon.blur();
  await expect(page.getByRole('tooltip')).toBeHidden();
  await page.getByRole('button', { name: 'Ring: Empty' }).focus();
  await expect(page.getByRole('tooltip')).toContainText('Accepts: Ring');
  for (const width of [1280, 1024]) {
    await page.setViewportSize({ width, height: 800 });
    await page.getByRole('button', { name: 'Close Equipment' }).focus();
    await page.getByText('Armor', { exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByText('Armor', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.goto(story('components-equipmentpanel--empty'));
  await expect(page.locator('[data-equipped="true"]')).toHaveCount(0);
  await expect(page.locator('[data-equipped="false"]')).toHaveCount(9);
});

test('wardrobe keeps one row and independent keyboard and touch details', async ({ page }) => {
  await page.goto(story('screens-compositions--wardrobe'));
  await expect(page.getByText('Power', { exact: true })).toHaveCount(4);
  await expect(page.getByText('MP', { exact: true })).toHaveCount(0);
  const ranger = page.getByRole('button', { name: 'Ranger select' });
  await ranger.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Ranger selected' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const spell = page.getByRole('button', { name: 'Base spell for Ranger: Piercing arrows' });
  await spell.focus();
  await expect(page.getByRole('tooltip')).toContainText('Cooldown: 0.7 seconds');
  await spell.blur();
  await expect(page.getByRole('tooltip')).toBeHidden();
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const tops = await page
      .getByRole('article')
      .evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await spell.dispatchEvent('touchstart', { touches: [{ identifier: 1 }] });
  await expect(page.getByRole('tooltip')).toContainText('Piercing arrows');
  await spell.dispatchEvent('touchend', { touches: [] });
});
