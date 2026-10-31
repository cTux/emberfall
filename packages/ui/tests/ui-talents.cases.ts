import { test, expect } from '@playwright/test';
import { story } from './ui.fixture.ts';

test('talents support two keyboard ranks and a zero-point state', async ({ page }) => {
  await page.goto(story('components-talenttree--interactive'));
  const talent = page.locator('[data-talent-node="node-0"]');
  await expect(talent).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)');
  const initialSize = await talent.boundingBox();
  await talent.focus();
  await expect(talent).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText('1 talent point available');
  await expect(talent).toHaveAccessibleName(/rank 1 of 2/);
  await expect(talent).not.toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)');
  expect(await talent.boundingBox()).toEqual(initialSize);
  await page.keyboard.press('Space');
  await expect(page.getByRole('status')).toHaveText('0 talent points available');
  await expect(talent).toHaveAccessibleName(/rank 2 of 2/);
  await expect(talent).toHaveAttribute('aria-disabled', 'true');
  await expect(talent).not.toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)');
  await expect(page.locator('[data-talent-node="node-1"]')).toHaveCSS(
    'border-top-color',
    'rgba(0, 0, 0, 0)',
  );
  await talent.blur();
  await page.mouse.move(1270, 890);
  await expect(page.getByRole('tooltip')).toBeHidden();
  await page.screenshot({ path: 'test-results/talent-learned-borders-desktop.png' });
  await page.setViewportSize({ width: 320, height: 700 });
  await page.screenshot({ path: 'test-results/talent-learned-borders-narrow.png' });
});

test('active talent icons have a distinct frame while passives keep their styling', async ({
  page,
}) => {
  await page.goto(story('components-talenttree--interactive'));
  const passive = page.locator('[data-talent-node="node-0"]');
  const active = page.locator('[data-talent-node="node-3"]');
  await expect(passive.locator(':scope > div').first()).toHaveCSS('outline-style', 'none');
  await expect(active.locator(':scope > div').first()).toHaveCSS('outline-width', '2px');
  await active.focus();
  await expect(page.getByRole('tooltip')).toContainText('Active ability');
  await page.keyboard.press('Enter');
  await expect(active).toHaveAccessibleName(/rank 1 of 2/);
  await expect(active.locator(':scope > div').first()).toHaveCSS('outline-width', '2px');
});

test('talent columns fit narrow screens without spending points', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(story('components-talenttree--interactive'));
  const canvas = page.locator('[data-talent-map]');
  expect(
    await canvas.evaluate((element) => {
      return element.scrollWidth <= element.clientWidth;
    }),
  ).toBe(true);
  await expect(page.getByRole('status')).toHaveText('2 talent points available');
  await page.locator('[data-talent-node="node-2"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText('1 talent point available');
});

test('talent tooltips explain ranks and dependencies on keyboard focus', async ({ page }) => {
  await page.goto(story('components-talenttree--interactive'));
  await page.locator('[data-talent-node="node-1"]').focus();
  await expect(page.getByRole('tooltip')).toContainText('No prerequisite talents');
  await expect(page.getByRole('tooltip')).toContainText('Learn the next rank for 1 point');
});

test('talent abilities share the base radial cooldown and countdown at every viewport', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });

  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 700 });
    await page.goto(story('components-actionbar--talent-cooldowns'));
    const bar = page.getByRole('region', { name: 'Action bar', exact: true });
    const base = bar.getByRole('progressbar', { name: 'Slash cooldown' });
    const whirlwind = bar.getByRole('progressbar', { name: 'Whirlwind cooldown' });
    await expect(whirlwind.locator('svg path')).toBeVisible();
    expect(await whirlwind.locator('svg path').getAttribute('d')).toBe(
      await base.locator('svg path').getAttribute('d'),
    );
    await expect(whirlwind).toHaveAttribute('aria-valuenow', '6500');
    await expect(whirlwind).toHaveAttribute('aria-valuetext', '7 seconds remaining');
    await expect(
      bar.getByRole('progressbar', { name: 'Sweeping strike cooldown' }).locator('svg rect'),
    ).toBeVisible();
    const ending = bar.getByRole('progressbar', { name: 'Earthshatter cooldown' });
    await expect(ending).toHaveAttribute('aria-valuetext', '0.3 seconds remaining');
    await expect(ending).toHaveText('0.3');
    await expect(
      bar.getByRole('button', { name: 'Choose ability for slot 2: Whirlwind', exact: true }),
    ).toBeEnabled();
    await expect(
      bar.getByRole('button', { name: 'Choose ability for slot 4: Execution', exact: true }),
    ).toBeEnabled();
    await expect(bar.getByRole('progressbar', { name: 'Execution cooldown' })).toHaveCount(0);
    const bounds = (await bar.boundingBox())!;
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    await bar.screenshot({ path: `test-results/talent-cooldowns-${width}.png` });
  }
});

test('LMB chooses during cooldown and RMB toggles animated auto-cast', async ({ page }) => {
  await page.goto(story('components-actionbar--interactive'));
  const slot = page.getByRole('button', { name: 'Choose ability for slot 1: Whirlwind' });
  await slot.click({ button: 'right' });
  await expect(slot).toHaveAttribute('data-auto-cast', 'true');
  await expect(page.getByRole('status')).toHaveText('Picker closed');
  const border = slot.locator('[data-auto-cast-border] rect');
  await expect(border).toHaveCSS('animation-name', 'auto-cast-dashes');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(border).toHaveCSS('animation-name', 'none');
  await slot.click({ button: 'right' });
  await expect(slot.locator('[data-auto-cast-border]')).toHaveCount(0);
  await slot.click();
  await expect(page.getByRole('status')).toHaveText('Picker opened');
});
