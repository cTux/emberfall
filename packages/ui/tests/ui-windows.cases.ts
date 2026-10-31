import { test, expect } from '@playwright/test';
import { story } from './ui.fixture.ts';

test('settings dropdowns share window surfaces and wood selection states', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 700 });
    await page.goto(story('screens-compositions--settings'));
    await page.getByRole('tab', { name: 'Graphics', exact: true }).click();
    const surface = page.locator('.game-window-surface');
    const colors = await surface.evaluate((element) => {
      const style = getComputedStyle(element);

      return {
        border: style.borderTop,
        radius: style.borderRadius,
      };
    });
    const select = page.getByRole('combobox', { name: 'Frame rate limit', exact: true });
    await select.focus();
    await page.keyboard.press('ArrowDown');
    const list = page.getByRole('listbox');
    const menu = page.locator('.MuiMenu-paper');
    await expect(list).toBeVisible();
    await expect(menu).toHaveCSS('background-color', 'rgb(40, 26, 20)');
    await expect(menu).toHaveCSS('border-top', colors.border);
    await expect(menu).toHaveCSS('border-radius', colors.radius);
    const selected = page.getByRole('option', { name: 'Display refresh rate' });
    await expect(selected).toHaveCSS('background-color', 'rgb(88, 53, 36)');
    await expect(selected).toHaveCSS('color', 'rgb(230, 190, 128)');
    await page.keyboard.press('ArrowDown');
    const option = page.getByRole('option', { name: '30 FPS' });
    await expect(option).toBeFocused();
    await expect(option).toHaveCSS('outline-style', 'solid');
    await expect(option).toHaveCSS('background-color', 'rgb(88, 53, 36)');
    await page.keyboard.press('Enter');
    await expect(select).toHaveText('30 FPS');
    await expect(select).toBeFocused();
    await select.click();
    await page.getByRole('option', { name: '60 FPS' }).hover();
    await expect(page.getByRole('option', { name: '60 FPS' })).toHaveCSS(
      'background-color',
      'rgb(88, 53, 36)',
    );
    const box = (await menu.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `test-results/settings-dropdown-${width}.png` });
    await page.keyboard.press('Escape');
  }
});

test('external modal tabs scroll, navigate and stay with the window at viewport edges', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(story('components-gamewindow--tabbed'));
  const dialog = page.getByRole('dialog', { name: 'Tabbed window' });
  const tabs = dialog.getByRole('tablist');
  const first = tabs.getByRole('tab', { name: 'Chapter 1', exact: true });
  await first.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(dialog.getByRole('tabpanel', { name: 'Chapter 3', exact: true })).toBeVisible();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(dialog.getByRole('tabpanel', { name: 'Chapter 12', exact: true })).toBeVisible();
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  await expect(first).toBeFocused();
  for (const size of [
    { width: 1280, height: 800 },
    { width: 320, height: 240 },
  ]) {
    await page.setViewportSize(size);
    const title = (await dialog.getByRole('heading', { name: 'Tabbed window' }).boundingBox())!;
    await page.mouse.move(title.x + 5, title.y + 5);
    await page.mouse.down();
    await page.mouse.move(0, 0, { steps: 5 });
    await page.mouse.up();
    await expect
      .poll(async () => {
        const box = (await dialog.boundingBox())!;

        return box.y + box.height;
      })
      .toBeLessThanOrEqual(size.height + 0.1);
    const rail = (await dialog.locator('.MuiTabs-root').boundingBox())!;
    const surface = (await dialog.locator('.game-window-surface').boundingBox())!;
    expect(rail.x).toBeGreaterThanOrEqual(-0.1);
    expect(rail.x + rail.width).toBeLessThanOrEqual(surface.x);
    expect(rail.y + rail.height).toBeLessThanOrEqual(size.height);
    expect(surface.x + surface.width).toBeLessThanOrEqual(size.width);
    const before = rail.y;
    await dialog.locator('.MuiDialogContent-root').evaluate((element) => {
      element.scrollTop = 100;
    });
    expect((await dialog.locator('.MuiTabs-root').boundingBox())!.y).toBe(before);
    await tabs.getByRole('tab', { name: 'Chapter 12', exact: true }).scrollIntoViewIfNeeded();
    await tabs.getByRole('tab', { name: 'Chapter 12', exact: true }).click();
    await expect(dialog.getByRole('tabpanel', { name: 'Chapter 12', exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`external-tabs-${size.width}.png`) });
  }

  await page.goto(story('components-gamewindow--tabbed-auto-height'));
  const surface = dialog.locator('.game-window-surface');
  await expect(surface).toBeVisible();
  expect((await surface.boundingBox())!.height).toBeLessThanOrEqual(208);
  expect(
    await dialog
      .locator('.MuiDialogContent-root')
      .evaluate((element) => element.scrollHeight > element.clientHeight),
  ).toBe(true);
});

test('dialog closes with Escape, restores focus and drags', async ({ page }) => {
  await page.goto(story('components-game-patterns--window'));
  const trigger = page.getByRole('button', { name: 'Open window' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Forest portal' });
  await expect(dialog).toBeVisible();
  const before = (await dialog.boundingBox())!;
  const title = (await dialog.getByText('Forest portal', { exact: true }).boundingBox())!;
  await page.mouse.move(title.x + 40, title.y + 10);
  await page.mouse.down();
  await page.mouse.move(title.x + 90, title.y + 45, { steps: 5 });
  await page.mouse.up();
  const after = (await dialog.boundingBox())!;
  expect(after.x).toBeGreaterThan(before.x + 30);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('tabs, settings and voting support keyboard and callbacks', async ({ page }) => {
  await page.goto(story('components-game-patterns--chapters'));
  await page.getByRole('tab', { name: 'Controls' }).focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('tabpanel', { name: 'Combat' })).toBeVisible();
  await page.goto(story('components-game-patterns--settings'));
  await page.getByRole('switch', { name: 'Sound effects' }).uncheck();
  await expect(page.getByRole('slider', { name: 'Effects volume' })).toBeDisabled();
  await page.goto(story('components-game-patterns--vote'));
  await page.getByRole('button', { name: "I'm ready" }).click();
  await expect(page.getByRole('heading', { name: 'Forest · Easy (2/2 ready)' })).toBeVisible();
  await page.getByRole('button', { name: 'Retract ready vote' }).click();
  await expect(page.getByRole('heading', { name: 'Forest · Easy (1/2 ready)' })).toBeVisible();
});
