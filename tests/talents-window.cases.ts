import { test, expect } from './fixtures';
import {
  TRAINING_ZONES,
  BULLSEYE,
  TALENT_TREE,
  talentDescription,
} from '../packages/core/src/index.ts';

test('talents use one vertical scrollbar and fit desktop, narrow and short windows', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Your adventurer name').fill('Talent scrolling');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await page.getByRole('button', { name: 'Talents' }).click();
  const tree = page.getByRole('region', { name: 'Talents', exact: true });
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 320, height: 740 },
    { width: 740, height: 320 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(tree.locator('[data-talent-node]')).toHaveCount(30);
    const scrollable = await tree
      .locator('*')
      .evaluateAll((elements) =>
        elements
          .filter(
            (element) =>
              /auto|scroll/.test(getComputedStyle(element).overflowY) &&
              element.scrollHeight > element.clientHeight,
          )
          .map((element) => element.className),
      );
    expect(scrollable).toHaveLength(1);
    expect(
      await tree.evaluate((element) =>
        [...element.querySelectorAll('*')].every((child) => child.scrollWidth <= child.clientWidth),
      ),
    ).toBe(true);
    await tree.locator('[data-talent-node]').first().focus();
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `test-results/talents-scroll-top-${viewport.width}.png` });
    const last = tree.locator('[data-talent-node]').last();
    await last.focus();
    await expect(last).toBeInViewport();
    await expect(tree.getByRole('button', { name: 'Close Talents' })).toBeInViewport();
    await expect(tree.getByRole('status')).toHaveText('1 talent point available');
    await page.screenshot({ path: `test-results/talents-scroll-${viewport.width}.png` });
  }
});

test('three independent columns support rank learning, custom tooltips, LMB assignment, casts and saved loadouts', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await page.getByLabel('Your adventurer name').fill('Talent hero');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  const world = [...game.runtime.worlds.values()].find((entry) => entry.players.size)!;
  const player = [...world.players.values()][0];
  await page.getByRole('button', { name: 'Talents' }).click();
  const tree = page.getByRole('region', { name: 'Talents', exact: true });
  await expect(tree.locator('[data-talent-node]')).toHaveCount(30);
  await expect(tree.getByRole('status')).toHaveText('1 talent point available');
  const wounds = tree.locator('[data-talent-node="v2:warrior:1:0"]');
  await wounds.hover();
  await expect(page.getByRole('tooltip').filter({ hasText: 'Open Wounds' })).toContainText(
    'Add 20 / 35 percentage points',
  );
  await wounds.click();
  await expect(wounds).toHaveAccessibleName(/rank 1 of 2/);
  player.level = 20;
  await expect(tree.getByRole('status')).toHaveText('19 talent points available');
  const cleave = tree.locator('[data-talent-node="v2:warrior:0:1"]');
  await cleave.click();
  await expect(cleave).toHaveAccessibleName(/rank 1 of 2/);
  await cleave.click();
  await expect(cleave).toHaveAccessibleName(/rank 2 of 2/);
  await expect(cleave).toHaveAttribute('aria-disabled', 'true');
  await page.screenshot({ path: 'test-results/talents-desktop.png' });
  await page.setViewportSize({ width: 390, height: 740 });
  await expect(tree).toBeVisible();
  expect((await tree.boundingBox())!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/talents-narrow.png' });
  await page.keyboard.press('n');
  const bar = page.getByRole('region', { name: 'Action bar', exact: true });
  await bar.getByRole('button', { name: 'Empty ability slot 1' }).click();
  await page.getByRole('menuitem', { name: 'Cleaving Strike', exact: true }).click();
  const cast = bar.getByRole('button', { name: 'Choose ability for slot 1: Cleaving Strike' });
  await expect(cast).toBeVisible();
  await cast.hover();
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toContainText(
    talentDescription(TALENT_TREE.find((node) => node.id === 'v2:warrior:0:1')!),
  );
  await expect(tooltip).not.toContainText(/LMB|RMB|auto-cast|to cast/);
  await cast.focus();
  await expect(tooltip).toBeVisible();
  await tooltip.screenshot({ path: 'test-results/action-bar-description.png' });
  player.x = TRAINING_ZONES[0].x;
  player.y = TRAINING_ZONES[0].y;
  await page.mouse.move(190, 350);
  await page.keyboard.press('1');
  await expect.poll(() => player.talentCooldowns?.['talent:warrior:0'] ?? 0).toBeGreaterThan(0);
  await expect(cast.getByRole('progressbar')).toBeVisible();
  await cast.click({ button: 'right' });
  await expect(cast).toHaveAttribute('data-auto-cast', 'true');
  await page.keyboard.press('f');
  await expect(cast).toHaveAttribute('data-auto-cast', 'false');
  const cooldown = player.talentCooldowns!['talent:warrior:0'];
  player.talentCooldowns!['talent:warrior:0'] = 0;
  await page.waitForTimeout(500);
  expect(player.talentCooldowns!['talent:warrior:0']).toBe(0);
  await page.keyboard.press('f');
  await expect.poll(() => player.talentCooldowns!['talent:warrior:0']).toBeGreaterThan(cooldown);
  await cast.click();
  const clear = page.getByRole('menuitem', { name: 'Clear slot', exact: true });
  const abilityTile = page.getByRole('menuitem', { name: 'Cleaving Strike', exact: true });
  await expect(page.locator('.MuiMenu-paper')).toHaveCSS('transform', 'none');
  expect((await clear.boundingBox())!.width).toBe((await abilityTile.boundingBox())!.width);
  expect((await clear.boundingBox())!.height).toBe((await abilityTile.boundingBox())!.height);
  await expect(clear.locator('img')).toHaveJSProperty('naturalWidth', 1254);
  await page.screenshot({ path: 'test-results/action-bar-icon-picker.png' });
  await expect(page.getByRole('menuitem', { name: 'Cleaving Strike', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Choose ability for slot 1: Cleaving Strike' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Choose ability for slot 1: Cleaving Strike' }),
  ).toHaveAttribute('data-auto-cast', 'true');
  await page.getByRole('button', { name: 'Choose ability for slot 1: Cleaving Strike' }).click();
  await page.getByRole('menuitem', { name: 'Clear slot', exact: true }).click();
  await expect(bar.getByRole('button', { name: 'Empty ability slot 1' })).toBeVisible();
  player.x = BULLSEYE!.x;
  player.y = BULLSEYE!.y - 15;
  player.coins = 100;
});
