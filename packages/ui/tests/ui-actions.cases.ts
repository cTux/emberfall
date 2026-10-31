import { test, expect } from '@playwright/test';
import { story } from './ui.fixture.ts';

test('HUD actions show hotkey badges and retain keyboard focus and disabled states', async ({
  page,
}) => {
  await page.goto(story('components-game-patterns--actions'));
  const controls = page.getByRole('navigation', { name: 'Game controls' });
  await expect(controls.locator('kbd')).toHaveText(['I', 'N', 'F1', 'Esc']);
  for (const [name, key] of [
    ['Inventory', 'I'],
    ['Talents', 'N'],
    ['Codex', 'F1'],
    ['Settings', 'Escape'],
  ]) {
    const button = controls.getByRole('button', { name, exact: true });
    await expect(button).toHaveAttribute('aria-keyshortcuts', key);
    await page.keyboard.press('Tab');
    await expect(button).toBeFocused();
    await expect(button.locator('kbd')).toBeVisible();
  }
  await expect(controls.getByRole('button', { name: 'Leave world' })).toBeDisabled();
  await expect(controls.getByRole('button', { name: 'Leave world' }).locator('kbd')).toHaveCount(0);
});

test('HUD tooltips show shortcuts while keeping accessible button names', async ({ page }) => {
  await page.goto(story('components-game-patterns--actions'));
  for (const [name, shortcut] of [
    ['Codex', 'F1'],
    ['Settings', 'Esc'],
  ]) {
    const action = page.getByRole('button', { name, exact: true });
    await action.focus();
    await expect(page.getByRole('tooltip')).toHaveText(`${name} (${shortcut})`);
    await action.blur();
    await page.mouse.move(700, 400);
    await expect(page.getByRole('tooltip')).toBeHidden();
  }
});

test('action bar hotkeys stay in slot corners and automation respects reduced motion', async ({
  page,
}) => {
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 700 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(story('components-actionbar--cooling-down'));
    const bar = page.getByRole('region', { name: 'Action bar', exact: true });
    const base = bar.getByRole('group', { name: 'Slash', exact: true });
    const fire = base.getByRole('img', { name: /^Left mouse button/ });
    const target = base.getByRole('img', { name: /^Auto-target/ });
    const bounds = (await base.boundingBox())!;
    for (const [indicator, right] of [
      [fire, true],
      [target, false],
    ] as const) {
      await expect(indicator).toHaveAttribute('data-active', 'true');
      await expect(indicator).toHaveCSS('animation-name', 'action-indicator-pulse');
      const box = (await indicator.boundingBox())!;
      expect(box.y).toBeGreaterThan(bounds.y + bounds.height / 2);
      expect(box.x > bounds.x + bounds.width / 2).toBe(right);
      // The corner overlays are above the radial cooldown mask.
      expect(await indicator.evaluate((element) => getComputedStyle(element).zIndex)).toBe('1');
    }
    for (const key of [1, 2, 3, 4]) {
      const slot = bar.getByRole('group', { name: `Empty ability slot ${key}`, exact: true });
      const label = slot.getByText(String(key), { exact: true });
      const s = (await slot.boundingBox())!;
      const l = (await label.boundingBox())!;
      expect(l.x).toBeGreaterThan(s.x + s.width / 2);
      expect(l.y).toBeGreaterThan(s.y + s.height / 2);
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(fire).toHaveCSS('animation-name', 'none');
    await expect(target).toHaveCSS('animation-name', 'none');
    await expect(fire).not.toHaveCSS('box-shadow', 'none');
    await page.screenshot({ path: `test-results/action-bar-hotkeys-${width}.png` });
  }
  for (const [state, fire, target] of [
    ['manual', false, false],
    ['auto-fire-only', true, false],
    ['auto-target-only', false, true],
  ] as const) {
    await page.goto(story(`components-actionbar--${state}`));
    await expect(page.getByRole('img', { name: /^Left mouse button/ })).toHaveAttribute(
      'data-active',
      String(fire),
    );
    await expect(page.getByRole('img', { name: /^Auto-target/ })).toHaveAttribute(
      'data-active',
      String(target),
    );
  }
});

test('action bar presents ready, cooling and unequipped slots on narrow screens', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(story('components-actionbar--cooling-down'));
  const bar = page.getByRole('region', { name: 'Action bar', exact: true });
  await expect(bar.getByRole('group')).toHaveCount(5);
  const cooldown = bar.getByRole('progressbar', { name: 'Slash cooldown' });
  await expect(cooldown).toHaveAttribute('aria-valuenow', '650');
  await expect(cooldown).toHaveAttribute('aria-valuetext', '0.7 seconds remaining');
  await expect(cooldown.locator('svg path')).toBeVisible();
  const bounds = (await bar.boundingBox())!;
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
  await page.screenshot({ path: 'test-results/action-bar-cooldown.png' });
  await page.goto(story('components-actionbar--ready'));
  await expect(bar.getByRole('progressbar')).toHaveCount(0);
  await expect(bar.getByRole('group', { name: 'Slash', exact: true })).toBeVisible();
  await page.goto(story('components-actionbar--unequipped'));
  await expect(bar.getByRole('group')).toHaveCount(4);
  await expect(bar.locator('img')).toHaveCount(0);
});
