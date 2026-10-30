import { test, expect } from '@playwright/test';

const story = (id: string) => `/iframe.html?id=${id}&viewMode=story`;

test('performance diagnostics stay compact with readable labels and all traces', async ({
  page,
}, testInfo) => {
  await page.goto(story('components-performancemonitor--network-diagnostics'));
  const monitor = page.getByRole('complementary', { name: 'Performance monitor' });
  await expect(monitor.getByLabel('Frame rate', { exact: true })).toHaveText('244 FPS');
  await expect(monitor.getByLabel('Server latency', { exact: true })).toHaveText('11 ms');
  await expect(monitor.getByLabel('Network scale')).toHaveText('0–145 ms');
  for (const label of ['Input ack', 'Snapshot (local)', 'Ping']) {
    await expect(monitor.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(monitor.locator('svg path')).toHaveCount(4);
  const bounds = await monitor.boundingBox();
  expect(bounds!.width).toBeLessThanOrEqual(224);
  expect(bounds!.height).toBeLessThanOrEqual(100);
  expect(await monitor.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
    true,
  );
  await monitor.screenshot({ path: testInfo.outputPath('compact-performance-monitor.png') });

  for (const [id, visible, hidden] of [
    ['fps-only', 'Frame rate', 'Server latency'],
    ['latency-only', 'Server latency', 'Frame rate'],
  ]) {
    await page.goto(story(`components-performancemonitor--${id}`));
    await expect(monitor.getByLabel(visible, { exact: true })).toBeVisible();
    await expect(monitor.getByLabel(hidden, { exact: true })).toHaveCount(0);
    expect((await monitor.boundingBox())!.height).toBeLessThanOrEqual(100);
  }
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

test('equipment slots accept inventory drops and retain keyboard unequipping', async ({ page }) => {
  await page.goto(story('components-equipmentpanel--drag-to-equip'));
  const item = page.getByRole('button', { name: 'Use Helmet', exact: true });
  await item.dragTo(page.getByRole('button', { name: 'Boots: Empty', exact: true }));
  await expect(item).toBeVisible();
  await item.dragTo(page.getByRole('button', { name: 'Helmet: Empty', exact: true }));
  const equipped = page.getByRole('button', { name: 'Helmet: Helmet', exact: true });
  await expect(equipped).toBeVisible();
  await expect(item).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Character stats' })).toContainText('Armor1');
  await equipped.focus();
  await page.keyboard.press('Enter');
  await expect(item).toBeVisible();
});

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

test('backpack passes modifier keys for mouse and keyboard actions', async ({ page }) => {
  await page.goto(story('components-backpack--modifiers'));
  const potion = page.getByRole('button', { name: 'Use Health potion (5)' });
  await potion.click({ button: 'right', modifiers: ['Shift'] });
  await expect(page.getByRole('status')).toHaveText('potion: Shift=true, Ctrl=false');
  await potion.focus();
  await potion.press('Control+Shift+Enter');
  await expect(page.getByRole('status')).toHaveText('potion: Shift=true, Ctrl=true');
  await potion.press('Space');
  await expect(page.getByRole('status')).toHaveText('potion: Shift=false, Ctrl=false');
});

test('inventory dragging moves once, ignores unrelated drops and preserves keyboard actions', async ({
  page,
}) => {
  await page.goto(story('components-backpack--drag-and-drop'));
  const backpack = page.getByRole('region', { name: 'Your backpack' });
  const storage = page.getByRole('region', { name: 'Storage', exact: true });
  const potion = backpack.getByRole('button', { name: 'Use Health potion (5)' });
  await potion.dragTo(storage, { targetPosition: { x: 12, y: 12 } });
  await expect(backpack.locator('[data-backpack-item]')).toHaveCount(0);
  await expect(storage.locator('[data-backpack-item]')).toHaveCount(1);
  const unrelated = await page.evaluateHandle(() => {
    const data = new DataTransfer();
    data.setData('text/plain', 'potion');
    return data;
  });
  await backpack.dispatchEvent('drop', { dataTransfer: unrelated });
  await expect(storage.locator('[data-backpack-item]')).toHaveCount(1);
  const malformed = await page.evaluateHandle(() => {
    const data = new DataTransfer();
    data.setData('application/x-emberfall-inventory-1', 'x'.repeat(65));
    return data;
  });
  await backpack.dispatchEvent('drop', { dataTransfer: malformed });
  await expect(storage.locator('[data-backpack-item]')).toHaveCount(1);
  const stored = storage.getByRole('button', { name: 'Use Health potion (5)' });
  await stored.focus();
  await stored.press('Enter');
  await expect(potion).toBeVisible();
  await expect(storage.locator('[data-backpack-item]')).toHaveCount(0);
});

test('storage supports forty slots and optional tab rename by mouse or keyboard', async ({
  page,
}) => {
  await page.goto(story('components-backpack--storage'));
  await expect(page.getByRole('region', { name: 'Storage 1' }).locator('button')).toHaveCount(40);
  await page.goto(story('components-chaptertabs--renameable'));
  await page.getByRole('tab', { name: 'Storage 1' }).click({ button: 'right' });
  await expect(page.getByRole('tab', { name: 'Renamed storage' })).toBeVisible();
  await page.reload();
  const tab = page.getByRole('tab', { name: 'Storage 1' });
  await expect(tab).toHaveAttribute('title', 'Storage 1 · Rename (F2)');
  await tab.focus();
  await tab.press('F2');
  await expect(page.getByRole('tab', { name: 'Renamed storage' })).toBeFocused();
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

test('inventory artwork stays centered inside every filled slot', async ({ page }, testInfo) => {
  for (const state of ['stacked', 'full', 'storage', 'selling']) {
    await page.goto(story(`components-backpack--${state}`));
    const slots = page.locator('[data-backpack-item]');
    await expect(slots.first()).toBeVisible();
    for (const slot of await slots.all()) {
      const bounds = (await slot.boundingBox())!;
      const icon = (await slot.locator('img').boundingBox())!;
      expect(Math.abs(icon.x + icon.width / 2 - bounds.x - bounds.width / 2)).toBeLessThan(1);
      expect(Math.abs(icon.y + icon.height / 2 - bounds.y - bounds.height / 2)).toBeLessThan(1);
    }
  }
  await page.screenshot({ path: testInfo.outputPath('centered-inventory-icons.png') });
});

test('backpacks show twenty wood-colored slots and tabs sit outside the left window border', async ({
  page,
}) => {
  for (const state of ['empty', 'stacked', 'full']) {
    await page.goto(story(`components-backpack--${state}`));
    const slots = page.getByRole('region', { name: 'Your backpack' }).locator('button');
    await expect(slots).toHaveCount(20);
    await expect(slots.first()).toHaveCSS('border-top-color', 'rgb(135, 80, 57)');
    await expect(slots.first()).toHaveCSS('background-color', 'rgb(40, 26, 20)');
  }
  await page.goto(story('screens-compositions--settings'));
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 800 });
    const title = page.getByRole('heading', { name: 'Settings', exact: true });
    const tabs = page.getByRole('tablist');
    const heading = (await title.boundingBox())!;
    const row = (await tabs.boundingBox())!;
    await expect(tabs).toHaveAttribute('aria-orientation', 'vertical');
    const surface = page.locator('.game-window-surface');
    const box = (await surface.boundingBox())!;
    expect(row.x + row.width).toBeLessThanOrEqual(box.x);
    expect(row.x).toBeGreaterThanOrEqual(0);
    const first = (await tabs.getByRole('tab').nth(0).boundingBox())!;
    const second = (await tabs.getByRole('tab').nth(1).boundingBox())!;
    expect(second.y).toBeGreaterThanOrEqual(first.y + first.height);
    expect(row.y - heading.y - heading.height).toBeLessThanOrEqual(12);
    await expect(page.getByRole('tab', { selected: true })).toHaveCSS(
      'background-color',
      'rgb(88, 53, 36)',
    );
    await expect(title.locator('..').locator('..')).toHaveCSS(
      'border-top-color',
      'rgb(135, 80, 57)',
    );
    await page.screenshot({ path: `test-results/compact-settings-${width}.png` });
  }
});

test('party bars use sixty percent of their old width with compact coins immediately after', async ({
  page,
}, testInfo) => {
  for (const [variant, amount, compact] of [
    ['playground', 13, '13'],
    ['thousands', 1000, '1k'],
    ['millions', 3000000, '3m'],
  ] as const) {
    await page.goto(story(`components-partycard--${variant}`));
    for (const width of [1280, 320]) {
      await page.setViewportSize({ width, height: 800 });
      const meter = page.getByRole('progressbar', { name: 'Astrid, lvl 1' });
      const coins = page.getByLabel(`Astrid: ${amount} coins`, { exact: true });
      await expect(coins).toHaveText(compact);
      const bar = (await meter.boundingBox())!;
      const available = await meter
        .locator('../../..')
        .evaluate((element) => element.getBoundingClientRect().width);
      expect(bar.width).toBeCloseTo(available * 0.6, 0);
      const balance = (await coins.boundingBox())!;
      expect(balance.x).toBeCloseTo(bar.x + bar.width + 8, 0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: testInfo.outputPath(`coins-${variant}-${width}.png`) });
    }
  }
});

test('companion health sits beneath the player at desktop and narrow widths', async ({
  page,
}, testInfo) => {
  await page.goto(story('components-partycard--with-companion'));
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 800 });
    const player = page.getByRole('progressbar', { name: 'Astrid, lvl 1' });
    const companion = page.getByRole('progressbar', { name: 'Bear', exact: true });
    await expect(companion).toHaveAttribute('aria-valuenow', '75');
    await expect(companion).toHaveAttribute('aria-valuemax', '150');
    const p = (await player.boundingBox())!;
    const c = (await companion.boundingBox())!;
    expect(c.y).toBeGreaterThanOrEqual(p.y + p.height);
    expect(c.height).toBeLessThan(p.height);
    expect(c.width).toBeLessThan(p.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath(`companion-${width}.png`) });
  }
  await page.goto(story('components-partycard--defeated-companion'));
  await expect(page.getByRole('progressbar', { name: 'Bear', exact: true })).toHaveAttribute(
    'aria-valuenow',
    '0',
  );
});

test('party keeps portrait corner icons beside health with a thinner XP row below', async ({
  page,
}, testInfo) => {
  await page.goto(story('components-partycard--host-away'));
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 800 });
    const card = page.getByRole('article');
    const meter = card.getByRole('progressbar', { name: 'Astrid, lvl 1' });
    await expect(card.getByRole('progressbar')).toHaveCount(2);
    const xp = card.getByRole('progressbar', { name: 'Astrid XP', exact: true });
    await expect(xp).toHaveAttribute('aria-valuetext', '25 / 50');
    await expect(card.getByText('Astrid, lvl 1', { exact: true })).toBeVisible();
    await expect(card.getByText('Host', { exact: true })).toHaveCount(0);
    const host = card.getByRole('img', { name: 'Host', exact: true });
    const dimension = card.getByRole('img', { name: 'In another dimension' });
    const portrait = host.locator('..');
    const p = (await portrait.boundingBox())!;
    const h = (await host.boundingBox())!;
    const d = (await dimension.boundingBox())!;
    const m = (await meter.boundingBox())!;
    const x = (await xp.boundingBox())!;
    expect(x.y).toBeGreaterThanOrEqual(m.y + m.height);
    expect(x.height).toBeLessThan(m.height);
    expect(p.height).toBe(m.height);
    expect(p.y).toBe(m.y);
    expect(h.y).toBe(p.y);
    expect(d.y).toBe(p.y);
    expect(d.x).toBe(p.x);
    expect(h.x + h.width).toBeCloseTo(p.x + p.width, 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath(`party-${width}.png`) });
  }
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

test('connection states use colored circles without visible text', async ({ page }) => {
  await page.goto(story('components-game-patterns--connection'));
  for (const [name, color] of [
    ['World server online', 'rgb(131, 203, 163)'],
    ['World server connecting', 'rgb(230, 190, 128)'],
    ['World server disconnected', 'rgb(239, 155, 133)'],
  ]) {
    const indicator = page.getByRole('status', { name });
    await expect(indicator).toBeVisible();
    await expect(indicator).toHaveText('');
    await expect(indicator).toHaveCSS('background-color', color);
    await expect(indicator).toHaveCSS('border-radius', '50%');
    await expect(indicator).toHaveCSS('width', '10px');
    await expect(indicator).toHaveCSS('height', '10px');
  }
});

test('lobby shows server columns, locked worlds and disabled creation', async ({ page }) => {
  await page.goto(story('screens-compositions--lobby'));
  await expect(page.getByRole('tab', { name: 'Join a world' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Join a world' })).toHaveCount(0);
  await expect(page.getByText('Worlds fade when the last adventurer leaves.')).toHaveCount(0);
  await page.getByLabel('Your adventurer name').fill('Astrid');
  await expect(page.getByRole('button', { name: 'Join Full world, full' })).toBeDisabled();
  await page.getByRole('button', { name: 'Join Northern grove, password protected' }).click();
  await page.getByLabel('Password for Northern grove').fill('password');
  await page.getByRole('button', { name: 'Join world', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('password submitted');
  await expect(page.getByRole('tab', { name: 'Create a world' })).toBeDisabled();
  await expect(page.getByRole('textbox', { name: 'World name', exact: true })).toHaveCount(0);
  for (const name of ['Name', 'Latency', 'Players'])
    await expect(page.getByRole('columnheader', { name, exact: true })).toBeVisible();
  await expect(page.getByRole('table')).toContainText('42 ms');
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.screenshot({ path: 'test-results/server-table.png' });
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

test('backpack header action mirrors gold and works with the keyboard', async ({ page }) => {
  await page.goto(story('components-backpack--selling'));
  const action = page.getByRole('button', { name: 'Sell all', exact: true });
  const gold = page.getByLabel('Your backpack: 5000 coins');
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 800 });
    const a = (await action.boundingBox())!;
    const g = (await gold.boundingBox())!;
    expect(a.x).toBeGreaterThan(g.x + g.width);
    expect(Math.abs(a.y + a.height / 2 - g.y - g.height / 2)).toBeLessThan(2);
  }
  await action.focus();
  await page.keyboard.press('Enter');
  await expect(action).toBeDisabled();
  await expect(page.locator('[data-backpack-item]')).toHaveCount(0);
});

test('meters expose clamped actual units', async ({ page }) => {
  await page.goto(story('components-game-patterns--meter'));
  const health = page.getByRole('progressbar', { name: 'Health' });
  await expect(health).toHaveAttribute('aria-valuenow', '75');
  await expect(health).toHaveAttribute('aria-valuemax', '100');
  await expect(page.getByRole('progressbar', { name: 'Invalid maximum' })).toHaveAttribute(
    'aria-valuenow',
    '0',
  );
  const fractional = page.getByRole('progressbar', { name: 'Fractional' });
  await expect(fractional).toHaveAttribute('aria-valuenow', '75.6');
  await expect(fractional).toHaveAttribute('aria-valuemax', '100.4');
  await expect(fractional).toHaveAttribute('aria-valuetext', '76 / 100');
  await expect(page.getByText('76 / 100', { exact: true })).toBeVisible();
});

test('performance and volume labels round without changing their underlying values', async ({
  page,
}) => {
  await page.goto(story('components-game-patterns--performance'));
  await expect(page.getByLabel('Frame rate', { exact: true })).toHaveText('60 FPS');
  await expect(page.getByLabel('Server latency', { exact: true })).toHaveText('33 ms');
  await page.goto(story('components-game-patterns--settings'));
  const volume = page.getByRole('slider', { name: 'Effects volume' });
  await volume.focus();
  await page.keyboard.press('ArrowRight');
  await expect(volume).toHaveAttribute('aria-valuenow', '0.65');
  await expect(volume).toHaveAttribute('aria-valuetext', '65%');
  await expect(page.getByText('65%', { exact: true })).toBeVisible();
});

test('all stories render; desktop and narrow screens fit', async ({ page, request }, testInfo) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const index = await (await request.get('/index.json')).json();
  for (const entry of Object.values(index.entries) as { id: string; type: string }[]) {
    if (entry.type !== 'story') continue;
    await page.goto(story(entry.id));
    await expect(page.locator('#storybook-root > *').first()).toBeAttached();
    await expect(page.locator('.sb-errordisplay')).toBeHidden();
    if (
      entry.id.startsWith('components-backpack--') ||
      entry.id.startsWith('components-equipmentpanel--')
    ) {
      const icons = page.locator('#storybook-root img');
      for (const icon of await icons.all()) {
        await expect
          .poll(() => icon.evaluate((image: HTMLImageElement) => image.naturalWidth))
          .toBeGreaterThan(0);
      }
      if (entry.id.endsWith('--stacked') || entry.id.endsWith('--starter')) {
        await page.screenshot({ path: testInfo.outputPath(`${entry.id}.png`) });
      }
    }
  }
  expect(errors).toEqual([]);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const name of [
      'lobby',
      'settings',
      'wardrobe',
      'codex',
      'hud',
      'portal',
      'confirmation',
      'fallen',
      'service',
    ]) {
      await page.goto(story(`screens-compositions--${name}`));
      await expect(page.locator('#storybook-root > *').first()).toBeAttached();
      await page.screenshot({ path: testInfo.outputPath(`${name}-${width}.png`), fullPage: true });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
    }
  }
  await page.goto('/iframe.html?id=guide-build-and-reuse--docs&viewMode=docs');
  await expect(page.getByText('Create a component', { exact: true })).toBeVisible();
});

test('server table keeps headers when empty and prevents full-server joins', async ({ page }) => {
  await page.goto(story('components-worldlist--empty'));
  await expect(page.getByRole('columnheader', { name: 'Name', exact: true })).toBeVisible();
  await expect(page.getByText('No servers available.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create a world' })).toHaveCount(0);
  await page.goto(story('components-worldlist--full'));
  await expect(page.getByRole('button', { name: /Join Playtest Default, full/ })).toBeDisabled();
  await expect(page.getByRole('table')).toContainText('32/32');
  await expect(page.getByRole('table')).toContainText('—');
});

test('world names stay on one line inside compact lobby columns', async ({ page }) => {
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(story('screens-compositions--lobby'));
    await page.getByLabel('Your adventurer name').fill('Astrid');
    const name = page.locator('span[title="Playtest Default"]');
    await expect(name).toHaveCSS('white-space', 'nowrap');
    await expect(name).toHaveCSS('text-overflow', 'ellipsis');
    expect(
      await name.evaluate((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return new Set(Array.from(range.getClientRects(), (rect) => Math.round(rect.top))).size;
      }),
    ).toBe(1);
    const cell = name.locator('xpath=ancestor::td');
    expect(await cell.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await name.hover();
    await page.screenshot({ path: `test-results/world-name-${width}.png` });
  }
});

test('server rows join once from every cell and keyboard, respecting disabled states', async ({
  page,
}) => {
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(story('components-worldlist--row-interaction'));
    const row = page.getByRole('row').filter({ hasText: 'Northern grove' });
    const join = row.getByRole('button');
    await page.mouse.move(0, 0);
    const restingBackground = await row.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );
    await join.hover();
    await expect(join).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(row).not.toHaveCSS('background-color', restingBackground);
    const status = page.getByRole('status');
    for (let cell = 0; cell < 3; cell++) {
      await row
        .getByRole('cell')
        .nth(cell)
        .click({ position: { x: 4, y: 4 } });
      await expect(status).toHaveText(`Joins: ${cell + 1}`);
    }
    await join.click();
    await expect(status).toHaveText('Joins: 4');
    await join.focus();
    await expect(join).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(status).toHaveText('Joins: 5');
    await page.keyboard.press('Space');
    await expect(status).toHaveText('Joins: 6');
    const full = page.getByRole('row').filter({ hasText: 'Full world' });
    for (let cell = 0; cell < 3; cell++) {
      await full
        .getByRole('cell')
        .nth(cell)
        .click({ position: { x: 4, y: 4 } });
    }
    await expect(full.getByRole('button')).toBeDisabled();
    await expect(status).toHaveText('Joins: 6');
    await page.goto(story('components-worldlist--disabled'));
    for (let cell = 0; cell < 3; cell++) {
      await row
        .getByRole('cell')
        .nth(cell)
        .click({ position: { x: 4, y: 4 } });
    }
    await expect(row.getByRole('button')).toBeDisabled();
    await expect(status).toHaveText('Joins: 0');
  }
});

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
  expect(await canvas.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
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
  expect((await tooltip.locator('.MuiTooltip-tooltip').boundingBox())!.width).toBeLessThanOrEqual(
    250,
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(tooltip).toBeVisible();
  await page.screenshot({ path: 'test-results/item-tooltip-consumable.png' });
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

test('unequipped gear shows compact signed gains and losses with keyboard access', async ({
  page,
}) => {
  await page.goto(story('components-backpack--comparison'));
  await page.getByRole('button', { name: 'Use Amulet', exact: true }).focus();
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toContainText('vs equipped Amulet');
  await expect(tooltip).toContainText('Bonus exp increase+20%');
  await expect(tooltip).toContainText('Bonus gold increase-10%');
  await expect(tooltip.getByText('+20%', { exact: true }).last()).toHaveCSS(
    'color',
    'rgb(131, 203, 163)',
  );
  expect((await tooltip.locator('.MuiTooltip-tooltip').boundingBox())!.width).toBeLessThanOrEqual(
    250,
  );
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Bonus exp increase: +20%' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await tooltip
    .filter({ hasText: 'vs equipped Amulet' })
    .screenshot({ path: 'test-results/item-stat-comparison.png' });
  await page.goto(story('components-backpack--same-stats'));
  await page.getByRole('button', { name: 'Use Amulet', exact: true }).focus();
  await expect(page.getByRole('tooltip')).toContainText('Same stats');
});
