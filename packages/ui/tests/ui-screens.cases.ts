import { test, expect } from '@playwright/test';
import { story } from './ui.fixture.ts';

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
  for (const name of ['Name', 'Latency', 'Players']) {
    await expect(page.getByRole('columnheader', { name, exact: true })).toBeVisible();
  }

  await expect(page.getByRole('table')).toContainText('42 ms');
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 800 });
    expect(
      await page.evaluate(() => {
        return document.documentElement.scrollWidth <= innerWidth;
      }),
    ).toBe(true);
  }

  await page.screenshot({ path: 'test-results/server-table.png' });
});

test('all stories render; desktop and narrow screens fit', async ({ page, request }, testInfo) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    return errors.push(error.message);
  });
  const index = await (await request.get('/index.json')).json();
  for (const entry of Object.values(index.entries) as { id: string; type: string }[]) {
    if (entry.type !== 'story') {
      continue;
    }

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
          .poll(() => {
            return icon.evaluate((image: HTMLImageElement) => {
              return image.naturalWidth;
            });
          })
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
        await page.evaluate(() => {
          return document.documentElement.scrollWidth <= window.innerWidth;
        }),
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

        return new Set(
          Array.from(range.getClientRects(), (rect) => {
            return Math.round(rect.top);
          }),
        ).size;
      }),
    ).toBe(1);
    const cell = name.locator('xpath=ancestor::td');
    expect(
      await cell.evaluate((element) => {
        return element.scrollWidth <= element.clientWidth;
      }),
    ).toBe(true);
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
    const restingBackground = await row.evaluate((element) => {
      return getComputedStyle(element).backgroundColor;
    });
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
